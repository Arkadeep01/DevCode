import { useState } from 'react';
import './CodeBlock.css';

export interface CodeBlockProps {
  code: string;
  lang?: string;
  /** Renders line numbers (used by the daily-challenge starter). */
  numbered?: boolean;
  copyable?: boolean;
  className?: string;
}

export function CodeBlock({ code, lang, numbered = false, copyable = false, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const lines = code.replace(/\n$/, '').split('\n');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  return (
    <div className={['code-block', className].filter(Boolean).join(' ')}>
      {(lang || copyable) && (
        <div className="code-block__bar">
          <span className="code-block__lang">{lang ?? 'code'}</span>
          {copyable ? (
            <button type="button" className="code-block__copy" onClick={copy}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          ) : null}
        </div>
      )}
      <pre className="code-block__pre" aria-label={lang ? `${lang} code` : 'code'}>
        <code>
          {numbered
            ? lines.map((line, index) => (
                <span key={index} className="code-block__line">
                  <span className="code-block__num" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="code-block__text">{line || ' '}</span>
                </span>
              ))
            : code}
        </code>
      </pre>
    </div>
  );
}
