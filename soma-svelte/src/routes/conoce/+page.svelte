<script>
	import Icon from '$lib/Icon.svelte';

	const VIDEO = '5xnD6VEbAZA';
	const pasos = [
		{ icon: 'mic', t: 'Contale qué te pasa', d: 'Mantené apretado el micrófono y hablá. SOMA lo guarda ordenado en tu historial.' },
		{ icon: 'flask', t: 'Subí tus estudios', d: 'Una foto o un PDF alcanza: SOMA lee los valores y te muestra cómo cambiaron.' },
		{ icon: 'activity', t: 'Llevalo a tu médico', d: 'Con todo junto, SOMA arma las posibilidades para hablar en la consulta.' }
	];
</script>

<svelte:head><title>SOMA · Conocé SOMA</title></svelte:head>

<div class="pagina">
	<header>
		<p class="eyebrow">Mirá el video · 2 minutos</p>
		<h1>Conocé SOMA</h1>
	</header>

	<section class="video card">
		<iframe
			src="https://www.youtube.com/embed/{VIDEO}?si=GKHdwbSqo1Pd7J8g"
			title="YouTube video player"
			allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
			referrerpolicy="strict-origin-when-cross-origin"
			allowfullscreen
		></iframe>
	</section>

	<section class="pasos">
		{#each pasos as p}
			<div class="card paso">
				<span class="ico"><Icon name={p.icon} size={20} /></span>
				<strong>{p.t}</strong>
				<span class="muted">{p.d}</span>
			</div>
		{/each}
	</section>

	<div class="acciones">
		<a class="btn primary" href="/"><Icon name="mic" size={16} /> Probar ahora</a>
		<a class="btn" href="https://youtu.be/{VIDEO}" target="_blank" rel="noopener"><Icon name="share" size={16} /> Ver en YouTube</a>
	</div>
</div>

<style>
	.pagina { display: grid; gap: 20px; padding-bottom: 24px; }
	h1 { margin-top: 4px; }
	.video { padding: 0; overflow: hidden; aspect-ratio: 16 / 9; }
	.video iframe { display: block; width: 100%; height: 100%; border: 0; }
	.pasos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
	.paso { padding: 16px 18px; display: grid; gap: 6px; align-content: start; font-size: 14px; line-height: 1.45; }
	.ico { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; background: var(--brand-soft); color: var(--brand); margin-bottom: 4px; }
	.acciones { display: flex; flex-wrap: wrap; gap: 10px; }
	@media (max-width: 700px) {
		.pasos { grid-template-columns: 1fr; }
	}
</style>
