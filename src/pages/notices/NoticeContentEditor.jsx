import React from 'react';
import { Box, Typography, GlobalStyles } from '@mui/material';
import { Editor } from '@tinymce/tinymce-react';

// TinyMCE self-host imports. Install: npm install @tinymce/tinymce-react tinymce
import 'tinymce/tinymce';
import 'tinymce/models/dom';
import 'tinymce/icons/default';
import 'tinymce/themes/silver';

import 'tinymce/plugins/advlist';
import 'tinymce/plugins/autolink';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/link';
import 'tinymce/plugins/charmap';
import 'tinymce/plugins/preview';
import 'tinymce/plugins/anchor';
import 'tinymce/plugins/searchreplace';
import 'tinymce/plugins/visualblocks';
import 'tinymce/plugins/code';
import 'tinymce/plugins/fullscreen';
import 'tinymce/plugins/insertdatetime';
import 'tinymce/plugins/table';
import 'tinymce/plugins/help';
import 'tinymce/plugins/wordcount';

import 'tinymce/skins/ui/oxide/skin.min.css';
import 'tinymce/skins/ui/oxide/content.min.css';
import 'tinymce/skins/content/default/content.min.css';

const toPlainText = (html = '') =>
  String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const transformSelectedText = (editor, transformFn) => {
  const selectedText = editor.selection.getContent({ format: 'text' });
  if (!selectedText) return;

  const html = escapeHtml(transformFn(selectedText)).replace(/\n/g, '<br />');

  editor.undoManager.transact(() => {
    editor.selection.setContent(html);
  });
};

export default function NoticeContentEditor({
  label = 'Content',
  value = '',
  onChange,
  disabled = false,
  height = 360,
}) {
  const showHelper = !toPlainText(value);

  return (
    <Box>
      <GlobalStyles
        styles={{
          '.tox-tinymce-aux, .tox-silver-sink, .tox-dialog-wrap, .tox-notifications-container': {
            zIndex: '17000 !important',
          },
          '.tox .tox-menu, .tox .tox-collection, .tox .tox-pop, .tox .tox-pop__dialog': {
            zIndex: '17001 !important',
          },
          '.tox .tox-table-resize-handle': {
            zIndex: '17002 !important',
          },
        }}
      />

      <Typography fontSize={13} fontWeight={700} sx={{ mb: 0.8 }}>
        {label}
      </Typography>

      <Box
        sx={{
          border: '1px solid #e5e7eb',
          borderRadius: 2.5,
          overflow: 'hidden',
          backgroundColor: '#fff',
          '& .tox-tinymce': {
            border: 'none',
            borderRadius: 0,
            fontFamily: 'inherit',
          },
          '& .tox .tox-toolbar, & .tox .tox-toolbar__primary, & .tox .tox-menubar': {
            backgroundColor: '#f9fafb',
          },
        }}
      >
        <Editor
          value={value || ''}
          disabled={disabled}
          onEditorChange={(newValue) => onChange?.(newValue)}
          init={{
            license_key: 'gpl',
            height,
            menubar: 'file edit view insert format table help',
            branding: false,
            promotion: false,
            statusbar: true,
            skin: false,
            content_css: false,
            plugins: [
              'advlist',
              'autolink',
              'lists',
              'link',
              'charmap',
              'preview',
              'anchor',
              'searchreplace',
              'visualblocks',
              'code',
              'fullscreen',
              'insertdatetime',
              'table',
              'help',
              'wordcount',
            ],
            toolbar:
              'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | ' +
              'forecolor backcolor | alignleft aligncenter alignright alignjustify | ' +
              'bullist numlist outdent indent | table link | uppercase lowercase removeformat | preview code fullscreen',
            table_toolbar:
              'tableprops tabledelete | ' +
              'tableinsertrowbefore tableinsertrowafter tabledeleterow | ' +
              'tableinsertcolbefore tableinsertcolafter tabledeletecol | ' +
              'tablecellprops tablemergecells tablesplitcells',
            contextmenu: 'link table',
            toolbar_mode: 'sliding',
            block_formats: 'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Quote=blockquote',
            font_size_formats: '10px 12px 13px 14px 16px 18px 20px 24px 28px 32px',
            paste_data_images: false,
            paste_as_text: false,
            entity_encoding: 'raw',
            object_resizing: true,
            table_resize_bars: true,
            table_use_colgroups: true,
            table_sizing_mode: 'relative',
            table_column_resizing: 'preservetable',
            table_default_attributes: { border: '1' },
            table_default_styles: {
              width: '100%',
              borderCollapse: 'collapse',
            },
            table_class_list: [
              { title: 'Default', value: '' },
              { title: 'Bordered', value: 'notice-table-bordered' },
            ],
            content_style: `
              body {
                font-family: Arial, Helvetica, sans-serif;
                font-size: 14px;
                line-height: 1.7;
                color: #111827;
                padding: 10px 12px;
              }
              p { margin: 6px 0; }
              ul, ol { padding-left: 24px; margin: 8px 0; }
              table { border-collapse: collapse; width: 100%; max-width: 100%; table-layout: fixed; }
              table td, table th { border: 1px solid #d1d5db; padding: 6px 8px; min-width: 24px; vertical-align: top; word-break: break-word; }
              td[data-mce-selected], th[data-mce-selected], .mce-item-selected { background-color: #bfdbfe !important; outline: 2px solid #2563eb !important; outline-offset: -2px !important; }
              blockquote { border-left: 4px solid #d1d5db; margin-left: 0; padding-left: 12px; color: #4b5563; }
            `,
            setup: (editor) => {
              editor.ui.registry.addButton('uppercase', {
                text: 'UPPERCASE',
                tooltip: 'Convert selected text to uppercase',
                onAction: () => transformSelectedText(editor, (text) => text.toUpperCase()),
              });
              editor.ui.registry.addButton('lowercase', {
                text: 'lowercase',
                tooltip: 'Convert selected text to lowercase',
                onAction: () => transformSelectedText(editor, (text) => text.toLowerCase()),
              });
            },
          }}
        />
      </Box>

      {showHelper && (
        <Typography fontSize={12} color="text.secondary" sx={{ mt: 0.7 }}>
          Compose content like Word: bold, italic, underline, font size, text color, alignment, tables, and lists.
        </Typography>
      )}
    </Box>
  );
}
