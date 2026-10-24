<script>
	import Icon from '$lib/Icon.svelte';
	import { ui } from '$lib/estado.svelte.js';
	import { subirEstudio } from '$lib/dictado.svelte.js';
	import { ESTADOS, fechaCorta } from '$lib/ui.js';

	let { data } = $props();
	let arrastrando = $state(false);

	const estudios = $derived([...data.db.estudios].sort((a, b) => b.fecha.localeCompare(a.fecha)));
	const alertas = (s) => s.valores.filter((v) => v.estado !== 'normal').length;

	// Marcadores repetidos entre estudios, para ver su evolución.
	const marcadores = $derived.by(() => {
		const m = new Map();
		for (const s of [...data.db.estudios].sort((a, b) => a.fecha.localeCompare(b.fecha)))
			for (const v of s.valores) {
				if (!m.has(v.nombre)) m.set(v.nombre, []);
				m.get(v.nombre).push({ ...v, fecha: s.fecha });
			}
		return [...m.entries()]
			.map(([nombre, puntos]) => ({ nombre, puntos, alerta: puntos.at(-1).estado !== 'normal' }))
			.sort((a, b) => b.puntos.length - a.puntos.length || b.alerta - a.alerta);
	});
	let elegido = $state('Ferritina');
	const serie = $derived(marcadores.find((m) => m.nombre === elegido) ?? marcadores[0]);

	// Geometría del gráfico de evolución.
	const W = 640, H = 210, PX = 48, PY = 28;
	const grafico = $derived.by(() => {
		if (!serie) return null;
		const p = serie.puntos;
		const ult = p.at(-1);
		const optimo = parseFloat(String(ult.optimo ?? '').replace(/[^\d.,]/g, '').replace(',', '.')) || null;
		const tope = Math.max(...p.map((x) => x.valor), optimo ?? 0, ult.min ?? 0) * 1.5 || 1;
		const y = (v) => H - PY - (Math.min(v, tope) / tope) * (H - PY * 2);
		const x = (i) => (p.length === 1 ? W / 2 : PX + (i / (p.length - 1)) * (W - PX * 2));
		return {
			tope, optimo, ult,
			pts: p.map((pt, i) => ({ ...pt, cx: x(i), cy: y(pt.valor) })),
			banda: ult.min != null && ult.max != null ? { y1: y(Math.min(ult.max, tope)), y2: y(ult.min) } : null,
			yOpt: optimo ? y(optimo) : null
		};
	});

	function soltar(e) {
		e.preventDefault();
		arrastrando = false;
		subirEstudio(e.dataTransfer.files[0]);
	}

	function posicion(v) {
		const tope = Math.max(v.max ?? v.valor, v.valor) * 1.25 || 1;
		return {
			punto: Math.min(98, (v.valor / tope) * 100),
			desde: ((v.min ?? 0) / tope) * 100,
			hasta: ((v.max ?? tope) / tope) * 100
		};
	}
</script>

<svelte:head><title>SOMA · Estudios</title></svelte:head>

<div class="pagina">
	<header>
		<p class="eyebrow">Todos tus estudios, en un solo lugar</p>
		<h1>Estudios</h1>
	</header>

	<button
		class="drop"
		class:on={arrastrando}
		onclick={() => ui.elegirArchivo?.()}
		ondragover={(e) => (e.preventDefault(), (arrastrando = true))}
		ondragleave={() => (arrastrando = false)}
		ondrop={soltar}
		disabled={ui.subiendo}
	>
		<span class="ico">
			{#if ui.subiendo}<span class="spin"><Icon name="sparkles" size={22} /></span>{:else}<Icon name="upload" size={22} />{/if}
		</span>
		<span class="txt">
			<strong>{ui.subiendo ? 'Leyendo el estudio…' : 'Subí un estudio'}</strong>
			<span class="muted">{ui.subiendo ? 'La IA está extrayendo los valores' : 'Arrastrá un PDF o una foto. SOMA lee los valores y los compara.'}</span>
		</span>
	</button>

	{#if grafico}
		<section class="card evolucion">
			<div class="cab">
				<div>
					<h2>Cómo cambiaron tus valores</h2>
					<p class="muted">Elegí un valor para ver su evolución entre estudios.</p>
				</div>
			</div>
			<div class="marcadores">
				{#each marcadores as m}
					<button class:on={serie.nombre === m.nombre} onclick={() => (elegido = m.nombre)}>
						{#if m.alerta}<span class="led"></span>{/if}{m.nombre}
					</button>
				{/each}
			</div>
			<svg viewBox="0 0 {W} {H}" class="grafico" role="img" aria-label="Evolución de {serie.nombre}">
				<defs>
					<linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
						<stop offset="0" stop-color="#14b8a6" stop-opacity="0.22" />
						<stop offset="1" stop-color="#14b8a6" stop-opacity="0" />
					</linearGradient>
				</defs>
				{#if grafico.banda}
					<rect x={PX - 20} y={grafico.banda.y1} width={W - PX * 2 + 40} height={grafico.banda.y2 - grafico.banda.y1} fill="#10b981" opacity="0.07" rx="6" />
					<text x={W - PX + 18} y={grafico.banda.y2 - 6} text-anchor="end" class="eje">rango {grafico.ult.min}–{grafico.ult.max}</text>
				{/if}
				{#if grafico.yOpt}
					<line x1={PX - 20} x2={W - PX + 20} y1={grafico.yOpt} y2={grafico.yOpt} stroke="#f59e0b" stroke-dasharray="5 5" />
					<text x={PX - 18} y={grafico.yOpt - 6} class="eje opt">óptimo {grafico.ult.optimo}</text>
				{/if}
				{#if grafico.pts.length > 1}
					<path d="M{grafico.pts.map((p) => `${p.cx},${p.cy}`).join(' L')} L{grafico.pts.at(-1).cx},{H - PY} L{grafico.pts[0].cx},{H - PY} Z" fill="url(#area)" />
					<polyline points={grafico.pts.map((p) => `${p.cx},${p.cy}`).join(' ')} fill="none" stroke="#0f766e" stroke-width="2.5" stroke-linejoin="round" />
				{/if}
				{#each grafico.pts as p}
					<circle cx={p.cx} cy={p.cy} r="6" fill="white" stroke={ESTADOS[p.estado].color} stroke-width="3" />
					<text x={p.cx} y={p.cy - 14} text-anchor="middle" class="valor">{p.valor} {p.unidad}</text>
					<text x={p.cx} y={H - 6} text-anchor="middle" class="eje">{fechaCorta(p.fecha)}</text>
				{/each}
			</svg>
		</section>
	{/if}

	<div class="estudios">
		{#each estudios as s (s.id)}
			<article class="card estudio" id={s.id}>
				<header>
					<span class="ico-est"><Icon name="flask" size={18} /></span>
					<div class="tit">
						<h2>{s.titulo}</h2>
						<p class="muted">{fechaCorta(s.fecha)}{s.lugar ? ' · ' + s.lugar : ''} · {s.tipo}</p>
					</div>
					{#if alertas(s)}
						<span class="chip alerta"><Icon name="alert" size={12} /> {alertas(s)} para revisar</span>
					{:else if s.valores.length}
						<span class="chip ok"><Icon name="check" size={12} /> Todo normal</span>
					{/if}
				</header>
				<p class="resumen">{s.resumen}</p>

				{#if s.valores.length}
					<div class="valores">
						{#each s.valores as v}
							{@const pos = posicion(v)}
							<div class="valor-fila">
								<span class="nombre">{v.nombre}</span>
								<span class="cifra" style="color:{ESTADOS[v.estado].color}">{v.valor} <small>{v.unidad}</small></span>
								<span class="pista" title="Rango {v.min ?? '–'} a {v.max ?? '–'}">
									<span class="normal" style="left:{pos.desde}%; width:{pos.hasta - pos.desde}%"></span>
									<span class="marca" style="left:{pos.punto}%; background:{ESTADOS[v.estado].color}"></span>
								</span>
								<span class="estado" style="color:{ESTADOS[v.estado].color}; background:{ESTADOS[v.estado].bg}">{ESTADOS[v.estado].label}</span>
							</div>
						{/each}
					</div>
				{/if}

				{#if s.archivo}
					<a class="archivo" href="/api/archivos/{s.archivo}" target="_blank" rel="noopener"><Icon name="file" size={14} /> Ver archivo original</a>
				{/if}
			</article>
		{/each}
	</div>
</div>

<style>
	.pagina { display: grid; gap: 20px; padding-bottom: 24px; }
	.drop {
		display: flex; align-items: center; gap: 16px; padding: 20px; border-radius: var(--radius); text-align: left;
		border: 2px dashed #cfe9e4; background: linear-gradient(135deg, #f2fbf9, #ffffff); transition: all 0.15s;
	}
	.drop:hover, .drop.on { border-color: var(--brand-2); background: #e9f8f5; }
	.drop .ico { width: 48px; height: 48px; border-radius: 14px; display: grid; place-items: center; background: var(--brand); color: white; flex: none; }
	.drop .txt { display: grid; gap: 2px; }
	.drop .txt span { font-size: 14px; }

	.evolucion { padding: 20px; display: grid; gap: 14px; }
	.evolucion .muted { font-size: 14px; }
	.marcadores { display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; }
	.marcadores button {
		display: inline-flex; align-items: center; gap: 6px; flex: none; height: 32px; padding: 0 12px; border-radius: 999px;
		font-size: 13px; font-weight: 550; border: 1px solid var(--line); color: var(--ink-2); background: var(--surface);
	}
	.marcadores button.on { background: var(--ink); color: white; border-color: var(--ink); }
	.led { width: 7px; height: 7px; border-radius: 50%; background: #f59e0b; }
	.grafico { width: 100%; height: auto; overflow: visible; }
	.grafico .eje { font-size: 11px; fill: #94a3b8; }
	.grafico .opt { fill: #b45309; }
	.grafico .valor { font-size: 13px; font-weight: 700; fill: var(--ink); }

	.estudios { display: grid; gap: 14px; }
	.estudio { padding: 18px; display: grid; gap: 12px; scroll-margin-top: 80px; }
	.estudio:target { box-shadow: 0 0 0 2px var(--estudio), var(--shadow-lg); }
	.estudio header { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
	.ico-est { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; background: var(--estudio-bg); color: var(--estudio); flex: none; }
	.tit { flex: 1; min-width: 180px; }
	.tit p { font-size: 13.5px; }
	.chip.alerta { background: #fff4e0; border-color: #fde3b0; color: #b45309; }
	.chip.ok { background: #e8f8f1; border-color: #bfead6; color: #047857; }
	.resumen { color: var(--ink-2); }
	.valores { display: grid; border-top: 1px solid var(--line); }
	.valor-fila {
		display: grid; grid-template-columns: minmax(120px, 1.2fr) 110px minmax(90px, 1fr) 128px; gap: 14px; align-items: center;
		padding: 10px 0; border-bottom: 1px solid var(--line); font-size: 14px;
	}
	.nombre { font-weight: 550; }
	.cifra { font-weight: 700; font-variant-numeric: tabular-nums; }
	.cifra small { font-weight: 500; color: var(--muted); }
	.pista { position: relative; height: 6px; border-radius: 99px; background: #eef1f4; }
	.pista .normal { position: absolute; top: 0; bottom: 0; background: #bbf0d9; border-radius: 99px; }
	.pista .marca { position: absolute; top: 50%; width: 12px; height: 12px; border-radius: 50%; transform: translate(-50%, -50%); border: 2px solid white; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25); }
	.estado { font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 999px; justify-self: start; }
	.archivo { display: inline-flex; gap: 6px; align-items: center; font-size: 13.5px; font-weight: 600; color: var(--estudio); justify-self: start; }

	@media (max-width: 640px) {
		.valor-fila { grid-template-columns: 1fr auto; row-gap: 6px; }
		.pista { grid-column: 1 / -1; order: 3; }
		.estado { order: 4; grid-column: 1 / -1; }
	}
</style>
