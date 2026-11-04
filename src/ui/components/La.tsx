/**
 * Latin text, left-to-right, where every known word opens its word-family card when tapped.
 */
import { createContext, useContext, type ReactNode } from 'react';
import { tokenize } from '../../content';

export const WordCardContext = createContext<(wordId: string) => void>(() => {});

export function useOpenWord() {
  return useContext(WordCardContext);
}

export function La({ text, className, interactive = true }: { text: string; className?: string; interactive?: boolean }) {
  const openWord = useOpenWord();
  const tokens = tokenize(text);
  return (
    <span className={`la ${className ?? ''}`} dir="ltr" lang="la">
      {tokens.map((token, i) =>
        token.wordId && interactive ? (
          <button key={i} type="button" className="la-word" onClick={() => openWord(token.wordId!)}>
            {token.text}
          </button>
        ) : (
          <span key={i}>{token.text}</span>
        ),
      )}
    </span>
  );
}

/** Wraps non-Latin left-to-right text (English, Romance languages) inside Hebrew. */
export function Ltr({ children, lang }: { children: ReactNode; lang?: string }) {
  return (
    <span dir="ltr" lang={lang} className="ltr">
      {children}
    </span>
  );
}
