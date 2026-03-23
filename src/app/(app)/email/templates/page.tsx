import { deleteTemplateAction, saveTemplateAction } from "@/app/email-actions";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function EmailTemplatesPage() {
  await requireUser();
  const templates = await prisma.emailTemplate.findMany({
    orderBy: { createdAt: "desc" },
    take: 10
  });

  return (
    <div className="stack">
      <section className="panel">
        <span className="kicker">Saved templates</span>
        <div className="stack">
          {templates.length ? (
            templates.map((template) => (
              <details key={template.id} className="accordion-panel">
                <summary>
                  <span>{template.name}</span>
                  <span className="summary-meta">{template.subject}</span>
                </summary>
                <div className="stack">
                  <div className="helper">Preview text: {template.previewText || "None"}</div>
                  <form action={deleteTemplateAction}>
                    <input type="hidden" name="templateId" value={template.id} />
                    <button className="button-danger" type="submit">
                      Delete template
                    </button>
                  </form>
                  <div className="html-preview" dangerouslySetInnerHTML={{ __html: template.htmlContent }} />
                </div>
              </details>
            ))
          ) : (
            <div className="empty">No templates saved yet.</div>
          )}
        </div>
      </section>

      <section className="panel">
        <span className="kicker">Create template</span>
        <form action={saveTemplateAction} className="form-grid">
          <div className="field">
            <label htmlFor="template-name">Template name</label>
            <input id="template-name" name="name" required />
          </div>
          <div className="field">
            <label htmlFor="template-subject">Subject</label>
            <input id="template-subject" name="subject" required />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="template-preview">Preview text</label>
            <input id="template-preview" name="previewText" />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="template-html-file">Upload HTML file</label>
            <input id="template-html-file" name="htmlFile" type="file" accept=".html,text/html" />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="template-html">Or paste HTML</label>
            <textarea id="template-html" name="htmlContent" className="editor-textarea" />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label htmlFor="template-text">Plain text version</label>
            <textarea id="template-text" name="textContent" className="editor-textarea" />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <button className="button" type="submit">
              Save template
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
