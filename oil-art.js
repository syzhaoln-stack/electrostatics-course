/**
 * Original oil-drop companions. Cosmetic choices share one silhouette so they
 * never imply a change in droplet mass. The surrounding UI owns accessible text.
 */
export function oilMascot({ mood = 'idle', style = 'goggles', id = 'oil' } = {}) {
  const validMoods = ['idle', 'falling', 'rising', 'steady', 'success', 'surprised'];
  const validStyles = ['goggles', 'blob', 'nerd'];
  const expression = validMoods.includes(mood) ? mood : 'idle';
  const costume = validStyles.includes(style) ? style : 'goggles';
  const prefix = `oil-${String(id).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const joyful = expression === 'success' || expression === 'steady';
  const surprised = expression === 'surprised';
  const gaze = expression === 'falling' ? 4 : expression === 'rising' ? -4 : 0;
  const arms = expression === 'success'
    ? ['M31 111 C16 105 14 89 18 81', 'M130 111 C145 105 146 89 142 81']
    : expression === 'rising'
      ? ['M31 110 C19 112 13 122 13 130', 'M130 110 C142 112 148 122 148 130']
      : expression === 'falling' || surprised
        ? ['M31 110 C17 106 12 98 12 89', 'M130 110 C144 106 149 98 149 89']
        : ['M31 112 C20 112 15 119 11 116', 'M130 112 C141 112 146 119 150 116'];
  const armMarkup = arms.map(path => `
    <path d="${path}" fill="none" stroke="#24465B" stroke-width="8" stroke-linecap="round"/>
    <path d="${path}" fill="none" stroke="#FFD65A" stroke-width="4.5" stroke-linecap="round"/>`).join('');

  const eye = (x, side) => {
    if (joyful) return `<path d="M${x - 7} 88 Q${x} 78 ${x + 7} 88" fill="none" stroke="#24465B" stroke-width="4.5" stroke-linecap="round"/>`;
    if (costume === 'blob' && expression === 'idle' && side === 'right') {
      return `<path d="M${x - 6} 88 Q${x} 94 ${x + 6} 87" fill="none" stroke="#24465B" stroke-width="4" stroke-linecap="round"/>`;
    }
    return `<ellipse cx="${x}" cy="${87 + gaze}" rx="${surprised ? 6 : 6.5}" ry="${surprised ? 9 : 8}" fill="#24465B"/>
      <circle cx="${x - 2}" cy="${84 + gaze}" r="2" fill="#fff"/>`;
  };

  let lenses;
  if (costume === 'goggles') {
    lenses = `<path d="M29 83 H132" stroke="#24465B" stroke-width="10" stroke-linecap="round"/>
      <path d="M29 83 H132" stroke="#527487" stroke-width="4" stroke-linecap="round"/>
      <path d="M77 84 Q81 80 85 84" fill="none" stroke="#24465B" stroke-width="6"/>
      <circle cx="59" cy="86" r="22" fill="#83C9DF" stroke="#24465B" stroke-width="3.5"/>
      <circle cx="102" cy="86" r="22" fill="#83C9DF" stroke="#24465B" stroke-width="3.5"/>
      <circle cx="59" cy="86" r="16.7" fill="#F8FDFF" stroke="#4E8298" stroke-width="1.5"/>
      <circle cx="102" cy="86" r="16.7" fill="#F8FDFF" stroke="#4E8298" stroke-width="1.5"/>
      <path d="M45 74 Q50 68 57 68 M88 74 Q93 68 100 68" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
      ${eye(60, 'left')}${eye(101, 'right')}`;
  } else if (costume === 'nerd') {
    lenses = `<ellipse cx="59" cy="86" rx="19" ry="21" fill="#FFFBE5"/>
      <ellipse cx="102" cy="86" rx="19" ry="21" fill="#FFFBE5"/>
      ${eye(60, 'left')}${eye(101, 'right')}
      <path d="M36 81 L28 77 M124 81 L132 77 M79 83 Q81 80 83 83" fill="none" stroke="#24465B" stroke-width="4" stroke-linecap="round"/>
      <rect x="37" y="65" width="44" height="41" rx="14" fill="none" stroke="#24465B" stroke-width="4"/>
      <rect x="82" y="65" width="44" height="41" rx="14" fill="none" stroke="#24465B" stroke-width="4"/>
      <path d="M44 76 L50 70 M89 76 L95 70" fill="none" stroke="#83C9DF" stroke-width="3" stroke-linecap="round"/>
      <path d="M69 143 L79 147 L69 151 Z M91 143 L81 147 L91 151 Z" fill="#83C9DF" stroke="#24465B" stroke-width="1.8"/>
      <circle cx="80" cy="147" r="3.5" fill="#24465B"/>`;
  } else {
    lenses = `<ellipse cx="59" cy="86" rx="19" ry="23" fill="#FFFDF2"/>
      <ellipse cx="102" cy="86" rx="19" ry="23" fill="#FFFDF2"/>
      ${eye(60, 'left')}${eye(101, 'right')}
      <path d="M45 59 Q53 55 59 58 M101 57 Q109 53 116 59" fill="none" stroke="#24465B" stroke-width="3" stroke-linecap="round"/>`;
  }

  const mouth = surprised
    ? '<ellipse cx="81" cy="120" rx="6" ry="8" fill="#24465B"/>'
    : expression === 'success'
      ? '<path d="M66 114 Q81 122 96 114 Q94 136 81 135 Q68 134 66 114Z" fill="#24465B"/><path d="M72 116 Q81 119 90 116 L88 122 H74Z" fill="#FFFDF2"/><path d="M74 132 Q81 123 88 132 Q81 137 74 132" fill="#EE8B78"/>'
      : expression === 'steady'
        ? '<path d="M69 116 Q81 129 94 116" fill="none" stroke="#24465B" stroke-width="4" stroke-linecap="round"/>'
        : expression === 'falling'
          ? '<path d="M74 119 Q81 114 89 120" fill="none" stroke="#24465B" stroke-width="3.5" stroke-linecap="round"/>'
          : '<path d="M70 116 Q80 126 92 115" fill="none" stroke="#24465B" stroke-width="3.5" stroke-linecap="round"/>';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 180" fill="none" aria-hidden="true" focusable="false" class="oil-mascot oil-mascot--${costume} oil-mascot--${expression}">
    <defs>
      <linearGradient id="${prefix}-body" x1="47" y1="44" x2="115" y2="153" gradientUnits="userSpaceOnUse">
        <stop stop-color="#FFE88A"/><stop offset=".48" stop-color="#FFD65A"/><stop offset="1" stop-color="#F3AB3A"/>
      </linearGradient>
    </defs>
    <g class="oil-mascot-arms">${armMarkup}</g>
    <path class="oil-mascot-tuft" d="M78 31 C69 17 81 9 87 16 C91 23 81 25 78 20" stroke="#24465B" stroke-width="3.5" stroke-linecap="round"/>
    <path class="oil-mascot-body" d="M80 28 C72 43 51 46 38 65 C27 81 24 104 29 122 C35 146 55 158 80 158 C105 158 125 146 131 122 C136 104 133 81 122 65 C109 46 88 43 80 28Z" fill="url(#${prefix}-body)" stroke="#24465B" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M48 55 Q58 46 66 45" stroke="#FFF4BD" stroke-width="6" stroke-linecap="round"/>
    <path d="M36 111 Q38 134 54 143" stroke="#FFEBA1" stroke-width="3" stroke-linecap="round" opacity=".75"/>
    <g class="oil-mascot-face">
      ${lenses}
      <ellipse cx="43" cy="111" rx="8" ry="4.5" fill="#EE8B78" opacity=".65"/>
      <ellipse cx="118" cy="111" rx="8" ry="4.5" fill="#EE8B78" opacity=".65"/>
      <path d="M80 102 L78 108 Q80 110 83 108" stroke="#D38F2C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      ${mouth}
    </g>
    ${expression === 'success' ? '<g class="oil-mascot-sparkles" fill="#FFD65A" stroke="#24465B" stroke-width="1.5"><path d="M20 43 L23 50 L30 53 L23 56 L20 63 L17 56 L10 53 L17 50Z"/><path d="M139 33 L141 38 L146 40 L141 42 L139 47 L137 42 L132 40 L137 38Z"/></g>' : ''}
  </svg>`;
}
