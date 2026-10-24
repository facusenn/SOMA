<script>
	import Icon from '$lib/Icon.svelte';
	import { page } from '$app/state';

	const base = $derived(page.url.origin);
	const endpoints = [
		{ m: 'POST', p: '/api/eventos', d: 'Registrar un evento con texto libre: { "texto": "me duele la cabeza" }' },
		{ m: 'GET', p: '/api/historia', d: 'Leer la historia completa: eventos, estudios y análisis' },
		{ m: 'POST', p: '/api/estudios', d: 'Subir un estudio (multipart, campo "archivo")' },
		{ m: 'GET', p: '/api/analisis', d: 'Leer el top 10 de posibles problemas' }
	];
</script>

<svelte:head><title>SOMA · Conectá tu agente</title></svelte:head>

<div class="pagina">
	<header>
		<p class="eyebrow">Abierto a cualquier asistente</p>
		<h1>Conectá tu agente</h1>
	</header>

	<section class="hero card">
		<div class="diagrama" aria-hidden="true">
			<span class="ag">Claude</span>
			<span class="ag">Gemini</span>
			<span class="ag">ChatGPT</span>
			<span class="centro"><img src="/favicon.svg" alt="" width="40" height="40" /> SOMA</span>
		</div>
		<div class="texto">
			<h2>SOMA no es un agente.</h2>
			<p>
				SOMA guarda tu historia de salud, en orden. El asistente que ya usás —de Anthropic, Google u OpenAI— se conecta
				para registrar lo que te pasa y ayudarte a entenderlo. Ellos hacen los agentes; SOMA cuida tus datos.
			</p>
			<p class="muted"><Icon name="lock" size={14} /> Cada agente accede solo a lo que vos autorizás.</p>
		</div>
	</section>

	<section class="card api">
		<h2>Cómo se conecta</h2>
		<div class="endpoints">
			{#each endpoints as e}
				<div class="ep">
					<span class="m" class:post={e.m === 'POST'}>{e.m}</span>
					<code>{e.p}</code>
					<span class="muted">{e.d}</span>
				</div>
			{/each}
		</div>
		<pre><code>curl -X POST {base}/api/eventos \
  -H "Content-Type: application/json" \
  -d '{`{"texto": "Fui al doctor y me dijo que tome hierro"}`}'</code></pre>
	</section>
</div>

<style>
	.pagina { display: grid; gap: 20px; padding-bottom: 24px; }
	.hero { display: grid; grid-template-columns: 300px 1fr; gap: 28px; padding: 24px; align-items: center; }
	.diagrama { position: relative; height: 220px; border-radius: 18px; background: radial-gradient(circle at 50% 55%, #10343a, #0a1a22); overflow: hidden; }
	.centro {
		position: absolute; left: 50%; top: 58%; transform: translate(-50%, -50%); display: grid; justify-items: center; gap: 4px;
		color: white; font-weight: 800; letter-spacing: 0.08em; font-size: 13px;
		filter: drop-shadow(0 0 24px rgba(45, 212, 191, 0.6));
	}
	.ag {
		position: absolute; padding: 5px 12px; border-radius: 999px; font-size: 12.5px; font-weight: 600; color: #ccfbf1;
		background: rgba(45, 212, 191, 0.12); border: 1px solid rgba(45, 212, 191, 0.35); animation: flotar 3s ease-in-out infinite;
	}
	.ag:nth-child(1) { left: 12px; top: 22px; }
	.ag:nth-child(2) { right: 14px; top: 40px; animation-delay: 0.6s; }
	.ag:nth-child(3) { left: 50%; transform: translateX(-50%); bottom: 14px; animation-delay: 1.2s; }
	@keyframes flotar { 50% { translate: 0 -5px; } }
	.texto { display: grid; gap: 10px; }
	.texto h2 { font-size: 22px; }
	.texto p { color: var(--ink-2); }
	.texto .muted { display: flex; gap: 6px; align-items: center; font-size: 14px; }
	.api { padding: 22px; display: grid; gap: 14px; }
	.endpoints { display: grid; gap: 8px; }
	.ep { display: grid; grid-template-columns: 54px 150px 1fr; gap: 12px; align-items: center; font-size: 14px; }
	.m { font-size: 11px; font-weight: 800; padding: 3px 0; text-align: center; border-radius: 6px; background: #e8f1ff; color: #1d4ed8; }
	.m.post { background: #e6f6f3; color: var(--brand); }
	code { font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 13px; }
	pre { margin: 0; padding: 16px; border-radius: 12px; background: #0b1720; color: #a7f3eb; overflow-x: auto; }
	@media (max-width: 760px) {
		.hero { grid-template-columns: 1fr; }
		.ep { grid-template-columns: 54px 1fr; }
		.ep .muted { grid-column: 1 / -1; }
	}
</style>
