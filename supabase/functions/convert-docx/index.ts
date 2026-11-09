// Supabase Edge Function: DOCX -> PDF using CloudConvert.
// Keep CLOUDCONVERT_API_KEY in Supabase Edge Function secrets; never put it in browser code.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const apiKey = Deno.env.get("CLOUDCONVERT_API_KEY");
    if (!apiKey) return json({ error: "DOCX conversion service is not configured. Add CLOUDCONVERT_API_KEY to Supabase secrets." }, 503);

    const body = await req.json();
    const filename = String(body.filename || "document.docx");
    const fileBase64 = String(body.fileBase64 || "");
    if (!filename.toLowerCase().endsWith(".docx")) return json({ error: "Only .docx files are accepted by this converter." }, 400);
    if (!fileBase64 || fileBase64.length > 11_200_000) return json({ error: "Missing file or file is larger than 8 MB." }, 413);

    const jobResponse = await fetch("https://sync.api.cloudconvert.com/v2/jobs", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        tasks: {
          "import-docx": { operation: "import/base64", file: fileBase64, filename },
          "convert-pdf": { operation: "convert", input: "import-docx", input_format: "docx", output_format: "pdf" },
          "export-pdf": { operation: "export/url", input: "convert-pdf" }
        },
        redirect: false
      })
    });
    const job = await jobResponse.json();
    if (!jobResponse.ok) {
      const message = job?.message || job?.errors?.[0]?.message || "CloudConvert rejected the conversion job.";
      return json({ error: message }, 502);
    }

    const exportTask = job?.data?.tasks?.find((task: any) => task.name === "export-pdf");
    const pdfUrl = exportTask?.result?.files?.[0]?.url;
    if (job?.data?.status !== "finished" || !pdfUrl) {
      const taskError = job?.data?.tasks?.find((task: any) => task.status === "error");
      return json({ error: taskError?.message || "Conversion did not finish. Please retry or upload a PDF." }, 502);
    }

    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) return json({ error: "Could not retrieve the converted PDF." }, 502);
    const pdfBytes = new Uint8Array(await pdfResponse.arrayBuffer());
    if (pdfBytes.length > 12 * 1024 * 1024) return json({ error: "Converted PDF is larger than the preview limit." }, 413);
    const binary = Array.from(pdfBytes, (b) => String.fromCharCode(b)).join("");
    const pdfBase64 = btoa(binary);
    return json({ filename: filename.replace(/\.docx$/i, ".pdf"), pdfBase64 });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unexpected conversion error." }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
