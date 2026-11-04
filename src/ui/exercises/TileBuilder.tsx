/** Word tiles: tap a tile to move it into the sentence line; tap it again to take it back. */
import { sentenceFromTiles } from '../../content';

export function TileBuilder({
  bank,
  placed,
  onChange,
  locked,
  punctuation = '',
}: {
  bank: string[];
  placed: number[];
  onChange: (placed: number[]) => void;
  locked: boolean;
  punctuation?: string;
}) {
  const sentence = placed.map((i) => bank[i]);
  return (
    <div className="tile-builder">
      <div className="answer-line" dir="ltr" lang="la" aria-label="המשפט שלך" aria-live="polite">
        {placed.length === 0 && <span className="placeholder" dir="rtl">הקישו על אריחים כדי לבנות את המשפט</span>}
        {placed.map((index, position) => (
          <button
            key={index}
            type="button"
            className="tile la-tile placed"
            disabled={locked}
            onClick={() => onChange(placed.filter((i) => i !== index))}
          >
            {position === 0 ? sentenceFromTiles([bank[index]]) : bank[index]}
            {position === placed.length - 1 ? punctuation : ''}
          </button>
        ))}
      </div>
      <div className="tile-bank" dir="ltr" lang="la">
        {bank.map((tile, index) => {
          const used = placed.includes(index);
          return (
            <button
              key={index}
              type="button"
              className={`tile la-tile ${used ? 'used' : ''}`}
              disabled={locked || used}
              aria-hidden={used}
              onClick={() => onChange([...placed, index])}
            >
              {tile}
            </button>
          );
        })}
      </div>
      <span className="visually-hidden">{sentenceFromTiles(sentence, punctuation)}</span>
    </div>
  );
}
