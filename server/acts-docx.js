// Генерация Word-документа (.docx) акта выполненных работ.
const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  ImageRun
} = require('docx');
const sizeOf = require('image-size');

function formatDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value || '';
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

const DOCX_IMG_TYPES = { jpg: 'jpg', jpeg: 'jpg', png: 'png', gif: 'gif', bmp: 'bmp' };

function field(label, value) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun(value || '—')]
  });
}

async function buildActDocx(act) {
  const children = [];

  children.push(
    new Paragraph({
      text: 'АКТ ВЫПОЛНЕННЫХ РАБОТ',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER
    })
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: 'Страйкбольная команда ВСТ13 — мастерская', italics: true })]
    })
  );

  children.push(field('Привод / снаряжение', act.device));
  children.push(field('Клиент', act.client));
  children.push(field('Дата', formatDate(act.created_at)));

  children.push(
    new Paragraph({
      spacing: { before: 160, after: 80 },
      children: [new TextRun({ text: 'Выполненные работы', bold: true, size: 26 })]
    })
  );
  for (const it of act.items || []) {
    children.push(
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun((it.done ? '☑  ' : '☐  ') + it.text)]
      })
    );
  }
  const done = (act.items || []).filter((it) => it.done).length;
  children.push(
    new Paragraph({
      spacing: { before: 120 },
      children: [
        new TextRun({ text: `Итого выполнено: ${done} из ${(act.items || []).length}`, bold: true })
      ]
    })
  );

  if (act.note) {
    children.push(new Paragraph({ spacing: { before: 160 } }));
    children.push(field('Примечание', act.note));
  }

  // Фото
  const photos = act.photos || [];
  if (photos.length) {
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 80 },
        children: [new TextRun({ text: 'Фотоотчёт', bold: true, size: 26 })]
      })
    );
    for (const url of photos) {
      try {
        const file = path.join(__dirname, 'uploads', path.basename(url));
        const data = fs.readFileSync(file);
        const dim = sizeOf(data);
        const type = DOCX_IMG_TYPES[(dim.type || '').toLowerCase()];
        if (!type) continue; // напр. webp — пропускаем
        const maxW = 380;
        const width = Math.min(maxW, dim.width || maxW);
        const height = Math.round((dim.height || width) * (width / (dim.width || width)));
        children.push(
          new Paragraph({
            spacing: { after: 120 },
            children: [new ImageRun({ type, data, transformation: { width, height } })]
          })
        );
      } catch {
        /* фото недоступно — пропускаем */
      }
    }
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

module.exports = { buildActDocx };
