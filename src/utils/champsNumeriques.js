// Filtres pour que les champs numériques n'acceptent que des chiffres
// (à la frappe comme au collage).

/** Numéro de téléphone : chiffres, espaces et les signes + ( ) . - */
export function filtrerTelephone(valeur) {
    return String(valeur ?? '').replace(/[^\d\s+().-]/g, '');
}

/** Nombre décimal positif : chiffres et un seul séparateur (. ou ,). */
export function filtrerDecimal(valeur) {
    const texte = String(valeur ?? '').replace(/[^\d.,]/g, '');
    const i = texte.search(/[.,]/);
    return i === -1 ? texte : texte.slice(0, i + 1) + texte.slice(i + 1).replace(/[.,]/g, '');
}

/**
 * Pour <input type="number"> : le navigateur laisse taper e, E, + et -.
 * À brancher sur onKeyDown pour les bloquer (nombres positifs, décimaux permis).
 */
export function bloquerSymbolesNombre(e) {
    if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault();
}

/** Idem pour un nombre entier : bloque aussi le point et la virgule. */
export function bloquerNonEntier(e) {
    if (['e', 'E', '+', '-', '.', ','].includes(e.key)) e.preventDefault();
}
