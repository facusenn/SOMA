<script>
	import { invalidate } from '$app/navigation';
	import Icon from '$lib/Icon.svelte';
	import { avisar } from '$lib/toast.svelte.js';
	import { fechaLarga, hora, fechaCorta } from '$lib/ui.js';

	let { data } = $props();
	let cargando = $state(false);
	let nivel = $state('todas');

	const ALERTAS = {
		urgente: { label: 'Urgente', color: '#b91c1c', bg: '#fee2e2', orden: 0 },
		alta: { label: 'Alerta alta', color: '#dc2626', bg: '#fdecec', orden: 1 },
		media: { label: 'Alerta media', color: '#c2410c', bg: '#fff1e6', orden: 2 },
		baja: { label: 'Alerta baja', color: '#475569', bg: '#eef2f6', orden: 3 }
	};
	const alertaDe = (it) => ALERTAS[it.alerta] ?? ALERTAS.media;

	const a = $derived(data.db.analisis);
	const items = $derived(a?.items ?? []);
	const nuevos = $derived(Math.max(0, data.db.eventos.length + data.db.estudios.length - (a ? a.eventos_analizados + a.estudios_analizados : 0)));
	const conteo = $derived(Object.fromEntries(Object.keys(ALERTAS).map((k) => [k, items.filter((i) => (i.alerta ?? 'media') === k).length])));
	const visibles = $derived(items.map((it, i) => ({ ...it, rank: i + 1 })).filter((it) => nivel === 'todas' || (it.alerta ?? 'media') === nivel));

	function evidencia(id) {
		const e = data.db.eventos.find((x) => x.id === id);
		if (e) return { texto: e.titulo, href: '/historial', icon: 'history' };
		const s = data.db.estudios.find((x) => x.id === id);
		if (s) return { texto: `${s.titulo} (${fechaCorta(s.fecha)})`, href: `/estudios#${s.id}`, icon: 'flask' };
		return null;
	}

	async function actualizar() {
		cargando = true;
		try {
			const res = await fetch('/api/analisis', { method: 'POST' });
			if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message ?? 'Error');
			await invalidate('soma:db');
			avisar('Análisis actualizado con todo tu historial');
		} catch (e) {
			avisar(e.message, 'error');
		} finally {
			cargando = false;
		}
	}

	async function copiar(texto, msg = 'Copiado') {
		await navigator.clipboard.writeText(texto);
		avisar(msg);
	}

	function copiarTodo() {
		const orden = [...items].sort((x, y) => alertaDe(x).orden - alertaDe(y).orden);
		const texto =
			`Para hablar con mi médico (${data.db.paciente.nombre}):\n\n` +
			orden.map((it) => `[${alertaDe(it).label}] ${it.posibilidad}\n• ${it.decirle}\n• Estudio sugerido: ${it.estudio}`).join('\n\n') +
			'\n\nGenerado con SOMA. No es un diagnóstico.';
		copiar(texto, 'Lista para el médico copiada');
	}
</script>

<svelte:head><title>SOMA · Posibles problemas</title></svelte:head>

<div class="pagina">
	<header class="encabezado">
		<div>
			<p class="eyebrow">Para hablar con tu médico</p>
			<h1>Posibles problemas</h1>
			{#if a}
				<p class="muted sub">
					Análisis de {a.eventos_analizados} registros y {a.estudios_analizados} estudios · {fechaLarga(a.generado)}, {hora(a.generado)}
				</p>
			{/if}
		</div>
		<div class="acciones">
			<button class="btn" onclick={copiarTodo} disabled={!items.length}><Icon name="copy" size={16} /> Copiar<span class="largo">&nbsp;para el médico</span></button>
			<button class="btn primary" onclick={actualizar} disabled={cargando || !data.conIA} title={data.conIA ? '' : 'Configurá la key de OpenRouter para recalcular'}>
				<span class:spin={cargando}><Icon name={cargando ? 'sparkles' : 'refresh'} size={16} /></span>
				{cargando ? 'Analizando…' : 'Actualizar'}<span class="largo">{cargando ? '' : ' análisis'}</span>
			</button>
		</div>
	</header>

	<div class="aviso">
		<Icon name="alert" size={18} />
		<p><strong>Esto no es un diagnóstico.</strong> Son posibilidades para hablar con tu médico, ordenadas por probabilidad según lo que registraste.</p>
	</div>

	{#if nuevos > 0 && !cargando}
		<button class="nuevos" onclick={actualizar} disabled={!data.conIA}>
			<Icon name="sparkles" size={16} />
			Tenés {nuevos} {nuevos === 1 ? 'registro nuevo' : 'registros nuevos'} desde el último análisis.
			<strong>{data.conIA ? 'Actualizar' : ''}</strong>
		</button>
	{/if}

	<div class="niveles">
		<button class:on={nivel === 'todas'} onclick={() => (nivel = 'todas')}>Todas <span>{items.length}</span></button>
		{#each Object.entries(ALERTAS) as [k, al]}
			{#if conteo[k]}
				<button class:on={nivel === k} style="--c:{al.color}; --cbg:{al.bg}" onclick={() => (nivel = nivel === k ? 'todas' : k)}>
					<span class="led"></span>{al.label} <span>{conteo[k]}</span>
				</button>
			{/if}
		{/each}
	</div>

	<div class="lista" class:cargando>
		{#each visibles as it (it.rank + it.posibilidad)}
			{@const al = alertaDe(it)}
			<article class="item card" style="--c:{al.color}; --cbg:{al.bg}">
				<div class="izq">
					<div class="cab">
						<span class="rank">{it.rank}</span>
						<div class="nombre">
							<h2>{it.posibilidad}</h2>
							<div class="prob">
								<span class="barra"><span style="width:{it.probabilidad}%"></span></span>
								<span>{it.probabilidad}% probable</span>
							</div>
						</div>
					</div>
					<p class="porque">{it.por_que}</p>
					{#if it.evidencia?.length}
						<div class="evid">
							{#each it.evidencia as id}
								{@const e = evidencia(id)}
								{#if e}<a class="chip" href={e.href}><Icon name={e.icon} size={12} /> {e.texto}</a>{/if}
							{/each}
						</div>
					{/if}
					<div class="descartar">
						<span class="ico"><Icon name="flask" size={16} /></span>
						<div><span class="eyebrow">Para descartarlo</span><p>{it.estudio}</p></div>
					</div>
				</div>
				<div class="der">
					<div class="der-cab">
						<span class="nivel"><span class="led"></span>{al.label}</span>
						<button class="copiar" onclick={() => copiar(it.decirle)} title="Copiar frase"><Icon name="copy" size={15} /></button>
					</div>
					<span class="eyebrow">Qué decirle al médico</span>
					<p class="frase">“{it.decirle}”</p>
				</div>
			</article>
		{:else}
			<div class="card vacio muted">Todavía no hay análisis. Registrá algunos eventos y tocá “Actualizar análisis”.</div>
		{/each}
	</div>
</div>

<style>
	.pagina { display: grid; gap: 18px; padding-bottom: 24px; }
	.encabezado { display: flex; justify-content: space-between; align-items: end; gap: 16px; flex-wrap: wrap; }
	.sub { font-size: 13.5px; margin-top: 4px; }
	.sub::first-letter { text-transform: uppercase; }
	.acciones { display: flex; gap: 8px; flex-wrap: wrap; }
	.aviso { display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px; border-radius: 14px; background: #fffbeb; border: 1px solid #fde68a; color: #92400e; font-size: 14px; }
	.aviso :global(svg) { flex: none; margin-top: 1px; }
	.nuevos {
		display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 14px; text-align: left;
		background: linear-gradient(135deg, #0f766e, #14b8a6); color: white; font-size: 14px; box-shadow: var(--shadow);
	}
	.nuevos strong { margin-left: auto; text-decoration: underline; }
	.niveles { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; }
	.niveles button {
		--c: var(--ink); --cbg: #eef1f4;
		display: inline-flex; align-items: center; gap: 7px; flex: none; height: 34px; padding: 0 13px; border-radius: 999px;
		font-size: 13.5px; font-weight: 550; border: 1px solid var(--line); background: var(--surface); color: var(--ink-2);
	}
	.niveles button span:last-child { color: var(--muted); font-size: 12px; font-weight: 600; }
	.niveles button.on { background: var(--cbg); border-color: var(--c); color: var(--c); }
	.led { width: 8px; height: 8px; border-radius: 50%; background: var(--c); }

	.lista { display: grid; gap: 14px; transition: opacity 0.2s; }
	.lista.cargando { opacity: 0.45; pointer-events: none; filter: saturate(0.6); }
	.item { display: grid; grid-template-columns: 1fr 320px; overflow: hidden; animation: rise 0.25s ease-out; }
	.izq { padding: 18px; display: grid; gap: 12px; align-content: start; }
	.cab { display: flex; gap: 14px; align-items: flex-start; }
	.rank {
		width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; flex: none;
		background: var(--ink); color: white; font-weight: 700; font-size: 15px;
	}
	.nombre { display: grid; gap: 6px; flex: 1; min-width: 0; }
	h2 { font-size: 16.5px; }
	.prob { display: flex; gap: 10px; align-items: center; font-size: 13px; color: var(--muted); font-weight: 500; }
	.prob .barra { flex: 0 1 180px; height: 6px; border-radius: 99px; background: #eef1f4; overflow: hidden; }
	.prob .barra span { display: block; height: 100%; border-radius: 99px; background: linear-gradient(90deg, #14b8a6, #0f766e); }
	.porque { color: var(--ink-2); font-size: 14.5px; }
	.evid { display: flex; flex-wrap: wrap; gap: 6px; }
	.evid a:hover { border-color: var(--brand); color: var(--brand); }
	.descartar { display: flex; gap: 12px; align-items: flex-start; padding: 12px; border-radius: 12px; background: var(--estudio-bg); }
	.descartar .ico { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; background: white; color: var(--estudio); flex: none; }
	.descartar p { font-size: 14px; font-weight: 550; color: var(--ink); }
	.der { padding: 18px; background: var(--cbg); border-left: 1px solid var(--line); display: grid; gap: 8px; align-content: start; }
	.der-cab { display: flex; justify-content: space-between; align-items: center; }
	.nivel { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 700; color: var(--c); text-transform: uppercase; letter-spacing: 0.04em; }
	.copiar { padding: 7px; border-radius: 9px; color: var(--muted); background: rgba(255, 255, 255, 0.7); }
	.copiar:hover { color: var(--ink); background: white; }
	.frase { font-size: 15px; font-weight: 500; line-height: 1.5; color: var(--ink); }
	.vacio { padding: 28px; text-align: center; }

	@media (max-width: 820px) {
		.item { grid-template-columns: 1fr; }
		.der { border-left: 0; border-top: 1px solid var(--line); }
		.acciones { width: 100%; }
		.acciones .btn { flex: 1; justify-content: center; white-space: nowrap; }
		.largo { display: none; }
	}
</style>
