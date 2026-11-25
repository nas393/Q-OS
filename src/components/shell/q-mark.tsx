/*
 * The Q mark, the brand's one symbol: a flat disc with a Q inside. Its colours come from the theme tokens
 * (--qm-fill, --qm-glyph in tokens.css). Outside the shell (sign-in) the Dusk defaults below apply.
 */
export function QMark({size=28,className="",title}:{size?:number;className?:string;title?:string}){
  return (
    <svg className={`qmark${className?` ${className}`:""}`} width={size} height={size} viewBox="0 0 64 64"
      role={title?"img":undefined} aria-label={title} aria-hidden={title?undefined:true} focusable="false">
      <circle cx="32" cy="32" r="31" style={{fill:"var(--qm-fill,#CC7A52)"}}/>
      <circle cx="29.5" cy="29.5" r="12.5" fill="none" strokeWidth="6.5" style={{stroke:"var(--qm-glyph,#1B1915)"}}/>
      <path d="M35.6 35.6 L46.2 46.2" fill="none" strokeWidth="6.5" strokeLinecap="round" style={{stroke:"var(--qm-glyph,#1B1915)"}}/>
    </svg>
  );
}
