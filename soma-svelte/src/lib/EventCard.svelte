<script>
	import Icon from '$lib/Icon.svelte';
	import { TIPOS, hora, fechaLarga, enCuanto } from '$lib/ui.js';

	let { ev, nuevo = false, conFecha = false, onborrar, oneditar } = $props();
	const t = $derived(TIPOS[ev.tipo] ?? TIPOS.sentir);
	let editando = $state(false);
	let borrador = $state('');
	let guardando = $state(false);

	async function guardar() {
		if (!borrador.trim()) return;
		guardando = true;
		try {
			await oneditar?.(ev, borrador.trim());
			editando = false;
		} catch {
			// el aviso de error ya se mostró; queda abierto para reintentar
		} finally {
			guardando = false;
		}
	}
</script>

<article class="evento card" class:nuevo style="--c: var(--{ev.tipo}); --cbg: var(--{ev.tipo}-bg)">
	<span class="icono"><Icon name={t.icon} size={18} /></span>
	<div class="cuerpo">
		<header>
			<div class="titulos">
				<h3>{ev.titulo}</h3>
				<span class="meta">
					<span class="tipo">{t.label}</span>
					· {conFecha ? fechaLarga(ev.fecha) + ', ' : ''}{hora(ev.fecha)}
				</span>
			</div>
			{#if onborrar}
				<div class="acciones">
					<button title="Corregir" onclick={() => ((borrador = ev.texto), (editando = !editando))}><Icon name="pencil" size={15} /></button>
					<button title="Borrar" onclick={() => onborrar(ev)}><Icon name="trash" size={15} /></button>
				</div>
			{/if}
		</header>

		{#if editando}
			<div class="editor">
				<textarea bind:value={borrador} rows="3"></textarea>
				<div class="fila">
					<button class="btn" onclick={() => (editando = false)}>Cancelar</button>
					<button class="btn primary" onclick={guardar} disabled={guardando}>
						{#if guardando}<span class="spin"><Icon name="refresh" size={15} /></span>{/if} Guardar y reprocesar
					</button>
				</div>
			</div>
		{:else}
			<p class="resumen">{ev.resumen}</p>

			{#if ev.tipo === 'cita' && ev.cita_fecha}
				<div class="cita">
					<Icon name="calendar" size={15} />
					<strong style="display:inline-block">{fechaLarga(ev.cita_fecha)}, {hora(ev.cita_fecha)}</strong>
					<span class="chip">{enCuanto(ev.cita_fecha)}</span>
				</div>
			{/if}

			{#if ev.intensidad}
				<div class="intensidad" title="Malestar {ev.intensidad} de 10">
					<span>Malestar</span>
					<span class="barra"><span style="width:{ev.intensidad * 10}%; background:{ev.intensidad >= 7 ? '#e11d48' : ev.intensidad >= 4 ? '#f59e0b' : '#10b981'}"></span></span>
					<strong>{ev.intensidad}/10</strong>
				</div>
			{/if}

			{#if ev.sintomas?.length || ev.comidas?.length || ev.medicamento || ev.medico || ev.lugar}
				<div class="chips">
					{#each ev.sintomas ?? [] as s}<span class="chip sintoma">{s}</span>{/each}
					{#each ev.comidas ?? [] as c}<span class="chip"><Icon name="food" size={12} /> {c}</span>{/each}
					{#if ev.medicamento}<span class="chip med"><Icon name="pill" size={12} /> {ev.medicamento}{ev.dosis ? ' · ' + ev.dosis : ''}</span>{/if}
					{#if ev.medico}<span class="chip"><Icon name="user" size={12} /> {ev.medico}{ev.especialidad ? ' · ' + ev.especialidad : ''}</span>{/if}
					{#if ev.lugar}<span class="chip"><Icon name="pin" size={12} /> {ev.lugar}</span>{/if}
				</div>
			{/if}

			{#if ev.indicaciones?.length && ev.tipo !== 'medicacion'}
				<ul class="indicaciones">
					{#each ev.indicaciones as i}<li><Icon name="check" size={13} /> {i}</li>{/each}
				</ul>
			{/if}

			{#if ev.estudio_id}
				<a class="ver" href="/estudios#{ev.estudio_id}"><Icon name="file" size={14} /> Ver estudio <Icon name="right" size={14} /></a>
			{/if}

			<p class="original"><Icon name="mic" size={12} /> “{ev.texto}”</p>
		{/if}
	</div>
</article>

<style>
	.evento { display: flex; gap: 14px; padding: 16px; position: relative; }
	.evento.nuevo { animation: rise 0.35s ease-out; box-shadow: 0 0 0 2px var(--c), var(--shadow-lg); }
	.icono { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; flex: none; background: var(--cbg); color: var(--c); }
	.cuerpo { flex: 1; min-width: 0; display: grid; gap: 10px; }
	header { display: flex; justify-content: space-between; gap: 8px; }
	h3 { font-size: 15.5px; font-weight: 650; line-height: 1.3; }
	.meta { font-size: 13px; color: var(--muted); }
	.tipo { color: var(--c); font-weight: 600; }
	.acciones { display: flex; gap: 2px; opacity: 0; transition: opacity 0.15s; }
	.evento:hover .acciones, .evento:focus-within .acciones { opacity: 1; }
	.acciones button { padding: 6px; border-radius: 8px; color: var(--muted); }
	.acciones button:hover { background: var(--surface-2); color: var(--ink); }
	.resumen { color: var(--ink-2); }
	.chips { display: flex; flex-wrap: wrap; gap: 6px; }
	.chip.sintoma { background: var(--sentir-bg); border-color: #fecdd3; color: #be123c; }
	.chip.med { background: var(--medicacion-bg); border-color: #fde68a; color: #92400e; }
	.intensidad { display: flex; align-items: center; gap: 10px; font-size: 13px; color: var(--muted); }
	.intensidad .barra { flex: 0 1 160px; height: 6px; border-radius: 99px; background: #eef1f4; overflow: hidden; }
	.intensidad .barra span { display: block; height: 100%; border-radius: 99px; }
	.intensidad strong { color: var(--ink); font-size: 13px; }
	.cita { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; color: var(--cita); font-size: 14px; }
	.cita strong { color: var(--ink); }
	.cita strong::first-letter { text-transform: uppercase; }
	.indicaciones { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; font-size: 14px; color: var(--ink-2); }
	.indicaciones li { display: flex; gap: 6px; align-items: center; }
	.indicaciones :global(svg) { color: var(--brand); }
	.ver { display: inline-flex; align-items: center; gap: 6px; font-size: 13.5px; font-weight: 600; color: var(--estudio); justify-self: start; }
	.original { font-size: 13px; color: #94a3b8; font-style: italic; display: flex; gap: 6px; align-items: baseline; }
	.original :global(svg) { flex: none; position: relative; top: 1px; }
	.editor { display: grid; gap: 8px; }
	textarea { width: 100%; border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; resize: vertical; outline-color: var(--brand); }
	.fila { display: flex; gap: 8px; justify-content: flex-end; }
	@media (hover: none) { .acciones { opacity: 1; } }
</style>
