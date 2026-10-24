export const toasts = $state([]);

export function avisar(texto, tipo = 'ok') {
	const id = Math.random();
	toasts.push({ id, texto, tipo });
	setTimeout(() => {
		const i = toasts.findIndex((t) => t.id === id);
		if (i >= 0) toasts.splice(i, 1);
	}, 3500);
}
