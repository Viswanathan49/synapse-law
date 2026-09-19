import docx
import sys

files = [
    'AI-Driven-Legal-Risk-Analysis-and-Contract-Analytics.docx',
    'Advanced-Prompt-Engineering-Strategies-for-Legal-AI.docx'
]

with open('d:/Project/Legal AI/docs_extracted.txt', 'w', encoding='utf-8') as out:
    for fname in files:
        out.write(f'\n\n========== {fname} ==========\n\n')
        doc = docx.Document(f'd:/Project/Legal AI/{fname}')
        for p in doc.paragraphs:
            if p.text.strip():
                out.write(p.text + '\n')

print('Done! Written to docs_extracted.txt')
