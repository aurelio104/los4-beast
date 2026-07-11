export interface ActionInfo {
  emoji: string;
  title: string;
  description: string;
  points?: string;
  rules: string[];
}

export type HubActionKey =
  | 'continue'
  | 'clemency'
  | 'renegotiate'
  | 'betray'
  | 'bribe'
  | 'vote'
  | 'alliance'
  | 'challenge'
  | 'arena'
  | 'tienda'
  | 'confesion'
  | 'chat'
  | 'eventos'
  | 'cofre'
  | 'notificaciones'
  | 'evento-activo';

export type GameActionKey =
  | 'redlight'
  | 'trivia'
  | 'ddakji'
  | 'glass'
  | 'honeycomb'
  | 'mystery'
  | 'coin'
  | 'tug';

export const HUB_ACTION_INFO: Record<HubActionKey, ActionInfo> = {
  continue: {
    emoji: '✅',
    title: 'Continuar',
    description: 'Confirma que sigues activo en el reto. Es tu check-in diario para demostrar que no te rindes.',
    points: '+10 Puntos',
    rules: ['Solo 1 vez al día', 'Aparece en el Feed del Drama', 'Ideal para mantener la racha']
  },
  clemency: {
    emoji: '🙏',
    title: 'Clemencia',
    description: 'Pides salir de una penalización o castigo del grupo. Tiene un costo en puntos — úsala con estrategia.',
    points: '−50 Puntos',
    rules: ['1 vez cada 10 días (por ciclo)', 'Resta puntos de tu total', 'El grupo puede ignorarla en persona 😈']
  },
  renegotiate: {
    emoji: '🤝',
    title: 'Renegociar',
    description: 'Propón cambiar las reglas del reto. Tu idea va al Feed y el grupo decide si la acepta.',
    points: '0 Puntos',
    rules: ['Escribe una propuesta clara', 'Sin límite de envíos', 'Requiere acuerdo del grupo en la vida real']
  },
  betray: {
    emoji: '💀',
    title: 'Traicionar',
    description: 'Saboteas a otro jugador en secreto. Nadie sabrá quién fue — aparece como "Alguien 👀" en el feed.',
    points: '+150 Puntos (tú) · −30 Puntos (víctima)',
    rules: ['1 traición por día', 'Completamente anónimo', 'Elige bien a tu objetivo']
  },
  bribe: {
    emoji: '💰',
    title: 'Soborno del día',
    description: 'Aceptas puntos extra a cambio de una penalización social. Cuanto más tarde en el día, más grande el soborno… y la trampa.',
    points: '50–500 Puntos según la hora',
    rules: ['1 soborno por ciclo de 10 días', 'Penalización obligatoria si aceptas', 'Madrugada: menos puntos, menos riesgo']
  },
  vote: {
    emoji: '🗳️',
    title: 'Votar eliminar',
    description: 'Votas quién debería hacer el reto más duro el 29 de agosto. El que más votos acumule… lo paga.',
    points: '+5 Puntos',
    rules: ['1 voto por ciclo de 10 días', 'Puedes cambiar tu voto en el mismo ciclo', 'Los resultados los ve el admin']
  },
  alliance: {
    emoji: '🤝',
    title: 'Alianza secreta',
    description: 'Formas un pacto con otro jugador para este ciclo. Solo ustedes dos saben del trato.',
    points: '+25 Puntos',
    rules: ['1 alianza por ciclo', 'Elige a tu compañero con cuidado', 'Las alianzas pueden romperse en persona']
  },
  challenge: {
    emoji: '⚔️',
    title: 'Desafío 1v1',
    description: 'Simulas un duelo contra otro jugador. Declaras si ganaste o perdiste — el honor (o el drama) manda.',
    points: 'Ganas: +75 Puntos · Pierdes: +10 Puntos',
    rules: ['1 desafío por día', 'Si ganas, tu rival pierde −15 Puntos', 'Ideal para rivalidades del grupo']
  },
  arena: {
    emoji: '🎮',
    title: 'Arena',
    description: '8 mini-juegos Red Light, Trivia, Ddakji, Glass Bridge y más.',
    points: 'Hasta +200 Puntos por juego',
    rules: ['1 juego de cada tipo por día', 'Confetti al ganar 🎉', 'Algunos juegos pueden restar puntos']
  },
  tienda: {
    emoji: '🛍️',
    title: 'Tienda',
    description: 'Canjea tus puntos por premios sociales de bajo costo. Nada caro — puro drama entre amigos.',
    points: 'Gastas Puntos al canjear',
    rules: ['Premios se entregan el 29 de agosto', 'Burger, pizza, cervezas, corona…', 'Necesitas Puntos suficientes']
  },
  confesion: {
    emoji: '🤐',
    title: 'Confesión',
    description: 'Deja un mensaje anónimo para el grupo. Se guarda en secreto hasta el gran día.',
    points: '+20 Puntos',
    rules: ['Máximo 500 caracteres', 'Anónimo hasta el 29 de agosto', 'El admin puede leerlas antes']
  },
  chat: {
    emoji: '💬',
    title: 'Chat del grupo',
    description: 'Habla en tiempo real con todos los miembros del Reto. Declaraciones, alianzas, drama — todo queda aquí.',
    points: '—',
    rules: ['Visible para todos los miembros', 'Máximo 500 caracteres por mensaje', 'Se actualiza automáticamente']
  },
  eventos: {
    emoji: '📅',
    title: 'Calendario de eventos',
    description: 'Cada 10 días hay un evento temático hasta el gran final del 29 de agosto.',
    points: 'Varía por evento',
    rules: ['5 fases + gran final', 'Cofre y mini-juegos por ciclo', 'Consulta qué evento está activo']
  },
  cofre: {
    emoji: '📦',
    title: 'Cofre',
    description: 'Cada ciclo de 10 días puedes abrir un cofre con pistas sobre el reto final y puntos extra.',
    points: '+100 Puntos por cofre',
    rules: ['1 cofre por ciclo', 'Las pistas se acumulan', 'Barra de progreso hacia el 29 ago']
  },
  notificaciones: {
    emoji: '🔔',
    title: 'Notificaciones push',
    description: 'Recibe alertas de eventos, recordatorios diarios y drama del grupo directo en tu móvil.',
    points: '—',
    rules: ['Funciona como PWA instalada', 'Puedes desactivarlas en el perfil', 'El admin puede enviar avisos']
  },
  'evento-activo': {
    emoji: '⚡',
    title: 'Evento activo',
    description: 'Estamos en un ciclo especial de 10 días. Participa en mini-juegos y abre el cofre antes de que termine.',
    points: 'Bonus del evento',
    rules: ['Dura ~10 días', 'Toca para ver el calendario completo', 'Cada evento tiene un juego destacado']
  }
};

export const GAME_ACTION_INFO: Record<GameActionKey, ActionInfo> = {
  redlight: {
    emoji: '🚦',
    title: 'Red Light',
    description: 'Toca la pantalla solo cuando la luz esté verde. Si tocas en rojo, pierdes. Llega a 10 taps para ganar.',
    points: 'Ganas: +80 Puntos · Pierdes: −20 Puntos',
    rules: ['1 partida por día', 'Inspirado en Squid Game', 'Reflejos y paciencia']
  },
  trivia: {
    emoji: '🧠',
    title: 'Trivia',
    description: 'Preguntas rápidas sobre el grupo y el reto. Responde bien para sumar puntos.',
    points: 'Correcta: +100 Puntos · Fallo: +10 Puntos',
    rules: ['1 partida por día', 'Preguntas del grupo', 'Siempre ganas algo']
  },
  ddakji: {
    emoji: '🎯',
    title: 'Ddakji Flip',
    description: 'Lanza la ficha para voltear la del rival. Suerte y timing — como en Squid Game.',
    points: 'Ganas: +90 Puntos · Pierdes: +15 Puntos',
    rules: ['1 partida por día', 'Toca para lanzar', 'Animación aleatoria']
  },
  glass: {
    emoji: '🌉',
    title: 'Glass Bridge',
    description: 'Elige el panel correcto en cada paso. Cada acierto te acerca al otro lado del puente.',
    points: 'Hasta +200 Puntos (25 Puntos por paso)',
    rules: ['1 partida por día', 'Memoria y suerte', 'Más pasos = más puntos']
  },
  honeycomb: {
    emoji: '🍯',
    title: 'Honeycomb',
    description: 'Recorta la forma sin romperla. Tu precisión define cuántos puntos ganas.',
    points: 'Según precisión (hasta ~120 Puntos)',
    rules: ['1 partida por día', 'Más precisión = más Puntos', 'Inspirado en Squid Game']
  },
  mystery: {
    emoji: '🎁',
    title: 'Caja Misteriosa',
    description: 'Elige 1 de 3 cajas. Solo una tiene el premio grande — las otras dan migajas.',
    points: 'Acierto: +120 Puntos · Fallo: +5 Puntos',
    rules: ['1 partida por día', 'Puramente suerte', 'Siempre ganas algo mínimo']
  },
  coin: {
    emoji: '🪙',
    title: 'Coin Flip',
    description: 'Apuesta tus puntos en cara o cruz. Ganas el doble o pierdes la apuesta.',
    points: '± apuesta (default 50 Puntos)',
    rules: ['1 partida por día', 'Necesitas Puntos para apostar', 'Alto riesgo, alta recompensa']
  },
  tug: {
    emoji: '💪',
    title: 'Tug of War',
    description: 'Toca lo más rápido posible en 10 segundos. Cada 3 taps = 1 punto.',
    points: 'Hasta +150 Puntos',
    rules: ['1 partida por día', '10 segundos de frenesí', 'Más taps = más Puntos']
  }
};

export const REWARD_INFO: Record<string, ActionInfo> = {
  burger: {
    emoji: '🍔',
    title: 'Burger del perdedor',
    description: 'El jugador con peor desempeño (o el perdedor del reto) paga la hamburguesa para el grupo.',
    points: '300 Puntos',
    rules: ['Se entrega el 29 de agosto', 'En persona, entre amigos', 'Premio social, bajo costo']
  },
  beer: {
    emoji: '🍺',
    title: 'Ronda de cervezas',
    description: 'El perdedor paga una ronda de cervezas (o bebidas) para todos.',
    points: '400 Puntos',
    rules: ['Se entrega el 29 de agosto', 'Solo mayores de edad 🍻', 'El grupo decide quién es el perdedor']
  },
  pizza: {
    emoji: '🍕',
    title: 'Pizza por género',
    description: 'Si pierde un género en el reto final, ese grupo paga la pizza para todos.',
    points: '500 Puntos',
    rules: ['Se entrega el 29 de agosto', 'Hombres vs mujeres en el reto', 'Premio grupal']
  },
  coffee: {
    emoji: '☕',
    title: 'Cafecito',
    description: 'El perdedor invita un café a quien el grupo elija.',
    points: '100 Puntos',
    rules: ['Premio más barato', 'Ideal para empezar a canjear', 'Entrega el 29 ago']
  },
  dj: {
    emoji: '🎵',
    title: 'DJ del día',
    description: 'El perdedor elige la playlist oficial del reto o de la reunión.',
    points: '200 Puntos',
    rules: ['Control total de la música', 'Puede ser vergonzoso 😂', 'Entrega el 29 ago']
  },
  photo: {
    emoji: '📸',
    title: 'Foto vergonzosa',
    description: 'El perdedor cambia su avatar por una foto vergonzosa elegida por el grupo durante 24 horas.',
    points: '150 Puntos',
    rules: ['Castigo visual', '24 horas de humillación', 'Entrega el 29 ago']
  },
  crown: {
    emoji: '👑',
    title: 'Corona',
    description: 'El canjeador elige el reto principal del gran día. El premio más codiciado.',
    points: '1000 Puntos',
    rules: ['Requiere muchos Puntos', 'Poder absoluto el 29 ago', 'Solo para el más dedicado']
  }
};
