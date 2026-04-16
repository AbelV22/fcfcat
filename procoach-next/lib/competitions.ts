/** Competition constants — no `fs` imports, safe for client components. */

/** Competition display names — slugs verified against fcf.cat */
export const COMPETITION_NAMES: Record<string, string> = {
  // Adult
  'tercera-federacio':           'Tercera Federació',
  'lliga-elit':                  'Lliga Elit',
  'primera-catalana':            'Primera Catalana',
  'segona-catalana':             'Segona Catalana',
  'tercera-catalana':            'Tercera Catalana',
  'quarta-catalana':             'Quarta Catalana',
  // Juvenil
  'divisio-honor-juvenil':       "Divisió d'Honor Juvenil",
  'lliga-nacional-juvenil':      'Lliga Nacional Juvenil',
  'preferent-juvenils':          'Preferent Juvenil',
  'juvenil-primera-divisio':     'Juvenil Primera Divisió',
  'segona-catalana-juvenil':     'Juvenil Segona Divisió',
  'tercera-catalana-juvenil':    'Juvenil Tercera Divisió',
  // Cadet S16
  'divisio-honor-cadet-s16':     "Divisió d'Honor Cadet S16",
  'preferent-cadet-s16':         'Preferent Cadet S16',
  'cadet-primera-divisio-s16':   'Cadet Primera Divisió S16',
  'cadet-segona-divisio-s16':    'Cadet Segona Divisió S16',
  // Cadet S15
  'divisio-honor-cadet-s15':     "Divisió d'Honor Cadet S15",
  'preferent-cadet-s15':         'Preferent Cadet S15',
  'cadet-primera-divisio-s15':   'Cadet Primera Divisió S15',
  'cadet-segona-divisio-s15':    'Cadet Segona Divisió S15',
  // Infantil S14
  'divisio-honor-infantil-s14':  "Divisió d'Honor Infantil S14",
  'preferent-infantil-s14':      'Preferent Infantil S14',
  'primera-divisio-infantil-s14':'Infantil Primera Divisió S14',
  // Infantil S13
  'divisio-honor-infantil-s13':  "Divisió d'Honor Infantil S13",
  'preferent-infantil-s13':      'Preferent Infantil S13',
  'infantil-primera-divisio-s13':'Infantil Primera Divisió S13',
}

/** Category labels */
export const COMPETITION_CATEGORY: Record<string, string> = {
  'tercera-federacio': 'adult', 'lliga-elit': 'adult',
  'primera-catalana': 'adult', 'segona-catalana': 'adult',
  'tercera-catalana': 'adult', 'quarta-catalana': 'adult',
  'divisio-honor-juvenil': 'juvenil', 'lliga-nacional-juvenil': 'juvenil',
  'preferent-juvenils': 'juvenil', 'juvenil-primera-divisio': 'juvenil',
  'segona-catalana-juvenil': 'juvenil', 'tercera-catalana-juvenil': 'juvenil',
  'divisio-honor-cadet-s16': 'cadet', 'preferent-cadet-s16': 'cadet',
  'cadet-primera-divisio-s16': 'cadet', 'cadet-segona-divisio-s16': 'cadet',
  'divisio-honor-cadet-s15': 'cadet', 'preferent-cadet-s15': 'cadet',
  'cadet-primera-divisio-s15': 'cadet', 'cadet-segona-divisio-s15': 'cadet',
  'divisio-honor-infantil-s14': 'infantil', 'preferent-infantil-s14': 'infantil',
  'primera-divisio-infantil-s14': 'infantil',
  'divisio-honor-infantil-s13': 'infantil', 'preferent-infantil-s13': 'infantil',
  'infantil-primera-divisio-s13': 'infantil',
}
