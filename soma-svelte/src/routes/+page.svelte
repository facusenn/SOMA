<script>
	import Icon from '$lib/Icon.svelte';
	import EventCard from '$lib/EventCard.svelte';
	import PendienteEstudio from '$lib/PendienteEstudio.svelte';
	import { ui } from '$lib/estado.svelte.js';
	import { Dictado, registrar, mmss, CANCELAR } from '$lib/dictado.svelte.js';
	import { TIPOS, hora, fechaLarga, enCuanto } from '$lib/ui.js';

	let { data } = $props();
	const d = new Dictado();
	// Al salir de la pantalla se corta el micrófono, si no seguiría reabriéndose solo.
	$effect(() => () => d.cancelar());
	let texto = $state('');

	// Ondas del visualizador: se animan mientras se graba.
	const N = 40;
	let barras = $state(Array(N).fill(0.08));
	$effect(() => {
		if (!d.grabando) {
			barras = Array(N).fill(0.08);
			return;
		}
		const id = setInterval(() => {
			barras = barras.map((_, i) => {
				const centro = 1 - Math.abs(i - N / 2) / (N / 2);
				return Math.max(0.08, Math.random() * (0.35 + centro * 0.65));
			});
		}, 90);
		return () => clearInterval(id);
	});

	const proximas = $derived(
		data.db.eventos
			.filter((e) => e.tipo === 'cita' && e.cita_fecha && new Date(e.cita_fecha) >= new Date(Date.now() - 864e5))
			.sort((a, b) => a.cita_fecha.localeCompare(b.cita_fecha))
	);
	const recientes = $derived([...data.db.eventos].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 3));
	const nombre = $derived(data.db.paciente.nombre.split(' ')[0]);

	const ejemplos = [
		'Me siento mal, comí milanesa con papas',
		'Fui al doctor y me dijo que tengo gastritis',
		'El lunes que viene tengo cita con el clínico',
		'Hoy me dieron los estudios de sangre'
	];

	const estado = $derived(
		ui.procesando ? 'procesando' : d.grabando ? (d.desplazamiento < -40 ? 'cancelando' : 'grabando') : 'listo'
	);

	function enviar(e) {
		e.preventDefault();
		const t = texto.trim();
		if (!t) return;
		texto = '';
		registrar(t);
	}
</script>

<svelte:head><title>SOMA · Registrar</title></svelte:head>

<div class="pagina">
	<div class="saludo">
		<p class="eyebrow">{fechaLarga(new Date().toISOString())}</p>
		<h1>Hola, {nombre}. ¿Cómo estás hoy?</h1>
	</div>

	<section class="escenario" data-estado={estado}>
		<div class="fondo" aria-hidden="true"></div>

		<p class="estado">
			{#if estado === 'procesando'}
				<span class="spin"><Icon name="sparkles" size={15} /></span> Ordenando lo que dijiste…
			{:else if estado === 'grabando'}
				<span class="rec"></span> {mmss(d.segundos)} · Soltá para guardar
			{:else if estado === 'cancelando'}
				<Icon name="x" size={15} /> Soltá para cancelar
			{:else}
				Mantené apretado y contame qué te pasó
			{/if}
		</p>

		<div class="orbe-zona">
			<span class="onda o1"></span><span class="onda o2"></span><span class="onda o3"></span>
			<button
				class="orbe"
				style="transform: translateX({d.desplazamiento}px) scale({d.grabando ? 1.08 : 1})"
				aria-label="Mantené apretado para hablar"
				onpointerdown={d.presionar}
				onpointermove={d.mover}
				onpointerup={d.soltar}
				onpointercancel={d.soltar}
				oncontextmenu={(e) => e.preventDefault()}
				disabled={!!ui.procesando}
			>
				<span class="anillo"></span>
				<span class="nucleo">
					{#if ui.procesando}
						<span class="spin"><Icon name="sparkles" size={46} stroke={1.6} /></span>
					{:else}
						<Icon name="mic" size={50} stroke={1.6} />
					{/if}
				</span>
			</button>
		</div>

		<div class="visualizador" aria-hidden="true">
			{#each barras as b}<span style="transform: scaleY({b})"></span>{/each}
		</div>

		<p class="transcripcion" class:vivo={d.grabando || ui.procesando}>
			{#if d.grabando}
				{d.transcripcion || 'Te escucho…'}
			{:else if ui.procesando}
				“{ui.procesando}”
			{:else}
				&nbsp;
			{/if}
		</p>

		{#if d.grabando}
			<p class="deslizar" style="opacity:{1 + d.desplazamiento / CANCELAR}"><Icon name="left" size={14} /> Deslizá para cancelar</p>
		{:else}
			<div class="ejemplos">
				{#each ejemplos as e}<span>“{e}”</span>{/each}
			</div>
		{/if}

		<form class="escribir" onsubmit={enviar}>
			<button type="button" class="clip" title="Subir estudio" onclick={() => ui.elegirArchivo?.()}><Icon name="clip" size={18} /></button>
			<input bind:value={texto} placeholder="…o escribilo acá" aria-label="Escribí lo que te pasó" />
			<button class="enviar" disabled={!texto.trim()} aria-label="Enviar"><Icon name="send" size={17} /></button>
		</form>
	</section>

	<PendienteEstudio />

	{#if ui.ultimo}
		<section class="bloque">
			<div class="titulo-bloque">
				<h2>Recién registrado</h2>
				<a href="/historial" class="mas">Ver historial <Icon name="right" size={14} /></a>
			</div>
			{#key ui.ultimo.id}
				<EventCard ev={data.db.eventos.find((e) => e.id === ui.ultimo.id) ?? ui.ultimo} nuevo />
			{/key}
		</section>
	{/if}

	<div class="grilla">
		<section class="bloque">
			<h2>Próxima cita</h2>
			{#if proximas.length}
				{#each proximas.slice(0, 2) as c}
					<div class="cita card">
						<div class="dia">
							<span>{new Date(c.cita_fecha).toLocaleDateString('es-AR', { month: 'short', timeZone: 'America/Argentina/Buenos_Aires' })}</span>
							<strong>{new Date(c.cita_fecha).toLocaleDateString('es-AR', { day: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' })}</strong>
						</div>
						<div class="info">
							<strong>{c.medico ?? c.titulo}</strong>
							<span class="muted">{c.especialidad ?? ''}{c.lugar ? ' · ' + c.lugar : ''}</span>
							<span class="cuando"><Icon name="calendar" size={13} /> {fechaLarga(c.cita_fecha)}, {hora(c.cita_fecha)} · {enCuanto(c.cita_fecha)}</span>
						</div>
					</div>
				{/each}
				<a class="btn primary consulta" href="/problemas"><Icon name="message" size={16} /> Preparar qué decirle al médico</a>
			{:else}
				<div class="vacio card muted">Decí “el lunes tengo cita con…” y aparece acá.</div>
			{/if}
		</section>

		<section class="bloque">
			<div class="titulo-bloque">
				<h2>Últimos registros</h2>
				<a href="/historial" class="mas">Todos <Icon name="right" size={14} /></a>
			</div>
			<div class="lista card">
				{#each recientes as e}
					<a href="/historial" class="item" style="--c: var(--{e.tipo}); --cbg: var(--{e.tipo}-bg)">
						<span class="ic"><Icon name={TIPOS[e.tipo].icon} size={15} /></span>
						<span class="tx"><strong>{e.titulo}</strong><span class="muted">{TIPOS[e.tipo].label} · {hora(e.fecha)}</span></span>
					</a>
				{/each}
			</div>
		</section>
	</div>
</div>

<style>
	.pagina { display: grid; gap: 24px; padding-bottom: 32px; }
	.saludo h1 { margin-top: 4px; }
	.saludo .eyebrow::first-letter { text-transform: uppercase; }

	/* ---------- Escenario del micrófono ---------- */
	.escenario {
		--a: #2dd4bf; --b: #22d3ee; --c2: #818cf8;
		position: relative; overflow: hidden; isolation: isolate;
		border-radius: 28px; padding: 28px 24px 22px;
		display: grid; justify-items: center; gap: 14px; text-align: center;
		background: radial-gradient(120% 90% at 50% 0%, #10343a 0%, #0a1a22 55%, #070f15 100%);
		color: #e6fffb; box-shadow: 0 30px 60px -20px rgba(7, 15, 21, 0.55);
	}
	.escenario[data-estado='grabando'] { --a: #fb7185; --b: #f472b6; --c2: #c084fc; }
	.escenario[data-estado='cancelando'] { --a: #94a3b8; --b: #cbd5e1; --c2: #64748b; }
	.fondo {
		position: absolute; inset: 0; z-index: -1; opacity: 0.55;
		background-image: linear-gradient(rgba(148, 255, 240, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 255, 240, 0.06) 1px, transparent 1px);
		background-size: 28px 28px;
		mask-image: radial-gradient(60% 60% at 50% 45%, black, transparent);
	}
	.estado { display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; color: #a7f3eb; min-height: 22px; font-variant-numeric: tabular-nums; }
	[data-estado='grabando'] .estado { color: #fecdd3; }
	.rec { width: 9px; height: 9px; border-radius: 50%; background: #fb7185; box-shadow: 0 0 12px #fb7185; animation: parpadeo 1s infinite; }
	@keyframes parpadeo { 50% { opacity: 0.3; } }

	.orbe-zona { position: relative; width: 260px; height: 260px; display: grid; place-items: center; }
	.onda {
		position: absolute; width: 170px; height: 170px; border-radius: 50%;
		border: 1px solid color-mix(in srgb, var(--a) 55%, transparent); opacity: 0;
	}
	[data-estado='listo'] .onda { animation: respirar 3.2s ease-out infinite; }
	[data-estado='grabando'] .onda { animation: expandir 1.6s ease-out infinite; }
	[data-estado='procesando'] .onda { animation: expandir 2.4s ease-out infinite; }
	.o2 { animation-delay: 0.53s !important; }
	.o3 { animation-delay: 1.06s !important; }
	@keyframes respirar { 0% { transform: scale(1); opacity: 0.35; } 100% { transform: scale(1.35); opacity: 0; } }
	@keyframes expandir { 0% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(1.75); opacity: 0; } }

	.orbe {
		position: relative; width: 176px; height: 176px; border-radius: 50%;
		display: grid; place-items: center; touch-action: none; user-select: none; -webkit-user-select: none;
		transition: transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1.3);
		-webkit-tap-highlight-color: transparent;
	}
	.orbe:disabled { cursor: progress; }
	.anillo {
		position: absolute; inset: -6px; border-radius: 50%;
		background: conic-gradient(from 0deg, var(--a), var(--b), var(--c2), var(--a));
		filter: blur(0.5px); animation: girar 6s linear infinite;
		-webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 4px), black calc(100% - 3px));
		mask: radial-gradient(farthest-side, transparent calc(100% - 4px), black calc(100% - 3px));
	}
	.anillo::after {
		content: ''; position: absolute; inset: 0; border-radius: 50%;
		background: inherit; filter: blur(22px); opacity: 0.7;
	}
	[data-estado='grabando'] .anillo { animation-duration: 1.6s; }
	[data-estado='procesando'] .anillo { animation-duration: 1s; }
	@keyframes girar { to { transform: rotate(360deg); } }
	.nucleo {
		position: relative; width: 100%; height: 100%; border-radius: 50%;
		display: grid; place-items: center; color: white;
		background:
			radial-gradient(circle at 35% 28%, rgba(255, 255, 255, 0.35), transparent 42%),
			radial-gradient(circle at 50% 60%, color-mix(in srgb, var(--a) 70%, #0b2a2e), #0b1f26 78%);
		box-shadow:
			inset 0 0 40px color-mix(in srgb, var(--b) 45%, transparent),
			0 0 60px color-mix(in srgb, var(--a) 45%, transparent),
			0 0 120px color-mix(in srgb, var(--c2) 25%, transparent);
		transition: background 0.3s, box-shadow 0.3s;
	}
	.orbe:hover .nucleo { box-shadow: inset 0 0 50px color-mix(in srgb, var(--b) 55%, transparent), 0 0 80px color-mix(in srgb, var(--a) 60%, transparent), 0 0 140px color-mix(in srgb, var(--c2) 30%, transparent); }

	.visualizador { display: flex; align-items: center; gap: 4px; height: 44px; margin-top: -18px; }
	.visualizador span {
		width: 4px; height: 44px; border-radius: 4px;
		background: linear-gradient(to top, var(--a), var(--b));
		transition: transform 0.09s linear; opacity: 0.9;
	}
	.transcripcion { max-width: 640px; min-height: 1.4em; font-size: 20px; font-weight: 500; line-height: 1.4; color: #f0fffd; letter-spacing: -0.01em; }
	.transcripcion.vivo { text-shadow: 0 0 24px color-mix(in srgb, var(--a) 35%, transparent); }
	.deslizar { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: #fecdd3; }
	.ejemplos { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; max-width: 680px; }
	.ejemplos span {
		font-size: 12.5px; color: #9fd9d1; padding: 5px 12px; border-radius: 999px;
		background: rgba(45, 212, 191, 0.08); border: 1px solid rgba(45, 212, 191, 0.18);
	}
	.escribir {
		margin-top: 6px; width: min(560px, 100%); display: flex; align-items: center; gap: 6px;
		padding: 5px; border-radius: 999px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.1);
	}
	.escribir input { flex: 1; min-width: 0; background: none; border: 0; outline: 0; color: white; padding: 0 4px; font-size: 14.5px; }
	.escribir input::placeholder { color: rgba(230, 255, 251, 0.45); }
	.escribir .clip, .escribir .enviar { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; color: #a7f3eb; flex: none; }
	.escribir .clip:hover { background: rgba(255, 255, 255, 0.08); }
	.escribir .enviar { background: linear-gradient(135deg, #2dd4bf, #0f766e); color: white; }
	.escribir .enviar:disabled { opacity: 0.35; cursor: default; }

	/* ---------- Bloques inferiores ---------- */
	.bloque { display: grid; gap: 12px; align-content: start; }
	.titulo-bloque { display: flex; justify-content: space-between; align-items: center; }
	.mas { display: inline-flex; align-items: center; gap: 4px; font-size: 13.5px; font-weight: 600; color: var(--brand); }
	.grilla { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
	.cita { display: flex; gap: 14px; padding: 14px; align-items: center; border-left: 4px solid var(--cita); }
	.dia { width: 54px; height: 58px; border-radius: 12px; background: var(--cita-bg); color: var(--cita); display: grid; place-items: center; align-content: center; line-height: 1.1; flex: none; }
	.dia span { font-size: 11px; font-weight: 700; text-transform: uppercase; }
	.dia strong { font-size: 22px; }
	.info { display: grid; gap: 2px; font-size: 14px; min-width: 0; }
	.cuando { display: inline-flex; gap: 6px; align-items: center; font-size: 13px; color: var(--cita); font-weight: 500; }
	.consulta { justify-self: start; }
	.vacio { padding: 18px; font-size: 14px; }
	.lista { padding: 6px; display: grid; }
	.item { display: flex; gap: 12px; align-items: center; padding: 10px; border-radius: 12px; }
	.item:hover { background: var(--surface-2); }
	.ic { width: 32px; height: 32px; border-radius: 10px; display: grid; place-items: center; background: var(--cbg); color: var(--c); flex: none; }
	.tx { display: grid; font-size: 14px; line-height: 1.35; min-width: 0; }
	.tx span { font-size: 12.5px; }

	@media (max-width: 900px) {
		.grilla { grid-template-columns: 1fr; }
		.saludo h1 { font-size: 23px; }
		.escenario { padding: 22px 16px 16px; border-radius: 24px; }
		.orbe-zona { width: 220px; height: 220px; }
		.orbe { width: 150px; height: 150px; }
		.onda { width: 150px; height: 150px; }
		.transcripcion { font-size: 17px; }
		.visualizador span { width: 3px; }
		.visualizador { gap: 3px; }
	}
	@media (max-width: 420px) {
		.ejemplos span:nth-child(n + 3) { display: none; }
	}
</style>
