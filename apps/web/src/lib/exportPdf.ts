import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { NodeEntity } from '@nodex/shared';

const escapeHtml = (str: string) =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const sanitizeFileName = (name: string) =>
  name.trim().replace(/[\\/:*?"<>|]+/g, '-').slice(0, 120) || 'nota';

const isImageAttachment = (fileName: string, fileType: string) =>
  fileType.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(fileName);

function renderFileAttachments(container: HTMLElement) {
  const attachmentEls = container.querySelectorAll('[data-type="file-attachment"]');
  attachmentEls.forEach((el) => {
    const fileName = el.getAttribute('filename') || 'Arquivo anexado';
    const fileSize = el.getAttribute('filesize') || '';
    const fileType = el.getAttribute('filetype') || '';
    const fileUrl = el.getAttribute('fileurl') || '';
    const ext = fileName.split('.').pop()?.toUpperCase() || '';

    const replacement = document.createElement('div');
    if (isImageAttachment(fileName, fileType) && fileUrl) {
      replacement.innerHTML = `
        <div style="margin: 12px 0;">
          <img src="${fileUrl}" alt="${escapeHtml(fileName)}" style="max-width:100%; max-height:420px; border-radius:8px; border:1px solid #e4e4e7; display:block;" />
          <div style="font-size:11px; color:#71717a; margin-top:4px;">${escapeHtml(fileName)}${fileSize ? ' · ' + escapeHtml(fileSize) : ''}</div>
        </div>`;
    } else {
      replacement.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px; margin:12px 0; padding:10px 14px; border:1px solid #e4e4e7; border-radius:10px; background:#f8f8f9;">
          <div style="width:36px; height:36px; border-radius:8px; background:#eef2ff; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0;">📎</div>
          <div>
            <div style="font-size:12px; font-weight:600; color:#18181b;">${escapeHtml(fileName)}</div>
            <div style="font-size:11px; color:#71717a;">${[fileSize, ext].filter(Boolean).map(escapeHtml).join(' · ')}</div>
          </div>
        </div>`;
    }
    el.replaceWith(replacement.firstElementChild as HTMLElement);
  });
}

async function waitForImages(container: HTMLElement) {
  const images = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    images.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
    )
  );
}

export async function exportNodeToPdf(node: NodeEntity): Promise<void> {
  const title = node.title || 'Nota sem título';

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '-99999px';
  container.style.width = '800px';
  container.style.background = '#ffffff';
  container.style.padding = '40px';
  container.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Arial, sans-serif";
  container.style.color = '#18181b';
  container.style.lineHeight = '1.6';

  container.innerHTML = `
    <style>
      .nx-pdf-title { font-size: 28px; font-weight: 800; margin: 0 0 4px 0; }
      .nx-pdf-icon { font-size: 32px; margin-right: 8px; }
      .nx-pdf-meta { color: #71717a; font-size: 12px; margin-bottom: 24px; border-bottom: 1px solid #e4e4e7; padding-bottom: 16px; }
      .nx-pdf-content h1, .nx-pdf-content h2, .nx-pdf-content h3 { font-weight: 700; margin: 1.4em 0 0.5em; }
      .nx-pdf-content h1 { font-size: 22px; }
      .nx-pdf-content h2 { font-size: 19px; }
      .nx-pdf-content h3 { font-size: 16px; }
      .nx-pdf-content p { margin: 0.6em 0; }
      .nx-pdf-content a { color: #4f46e5; }
      .nx-pdf-content blockquote { border-left: 3px solid #d4d4d8; margin: 1em 0; padding: 0.2em 1em; color: #52525b; }
      .nx-pdf-content pre { background: #f4f4f5; border-radius: 6px; padding: 12px; overflow-x: auto; font-size: 13px; white-space: pre-wrap; }
      .nx-pdf-content code { background: #f4f4f5; border-radius: 3px; padding: 0 4px; font-size: 0.9em; }
      .nx-pdf-content pre code { background: none; padding: 0; }
      .nx-pdf-content ul, .nx-pdf-content ol { padding-left: 1.4em; }
      .nx-pdf-content ul[data-type="taskList"] { list-style: none; padding-left: 0; }
      .nx-pdf-content li[data-type="taskItem"] { display: flex; align-items: flex-start; gap: 8px; margin: 0.3em 0; }
      .nx-pdf-content li[data-type="taskItem"] > label { margin-top: 3px; }
      .nx-pdf-content li[data-type="taskItem"] p { margin: 0; }
      .nx-pdf-content hr { border: none; border-top: 1px solid #e4e4e7; margin: 1.6em 0; }
      .nx-pdf-content img { max-width: 100%; border-radius: 6px; }
      .nx-pdf-content .wikilink { color: #4f46e5; font-weight: 600; }
    </style>
    <div class="nx-pdf-title">${node.icon ? `<span class="nx-pdf-icon">${node.icon}</span>` : ''}${escapeHtml(title)}</div>
    <div class="nx-pdf-meta">Exportado de NodeX em ${new Date().toLocaleString('pt-BR')}</div>
    <div class="nx-pdf-content">${node.contentMarkdown || ''}</div>
  `;

  document.body.appendChild(container);

  try {
    renderFileAttachments(container);
    await waitForImages(container);

    const canvas = await html2canvas(container, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
    });

    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL('image/png');

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`${sanitizeFileName(title)}.pdf`);
  } finally {
    container.remove();
  }
}
