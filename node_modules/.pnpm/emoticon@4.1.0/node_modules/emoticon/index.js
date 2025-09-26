/**
 * @typedef Emoticon
 *   Info on an emoticon.
 * @property {string} description
 *   Associated description (from `wooorm/gemoji`).
 * @property {string} emoji
 *   Corresponding emoji.
 * @property {Array<string>} emoticons
 *   ASCII emoticons.
 * @property {string} name
 *   Name of an emoticon (preferred name from `wooorm/gemoji`).
 * @property {Array<string>} tags
 *   Associated tags (from `wooorm/gemoji`).
 */

/**
 * List of emoticons.
 *
 * @type {Array<Emoticon>}
 */
export const emoticon = [
  {
    description: 'angry face',
    emoji: '😠',
    emoticons: ['>:(', '>:[', '>:-(', '>:-[', '>=(', '>=[', '>=-(', '>=-['],
    name: 'angry',
    tags: ['mad', 'annoyed']
  },
  {
    description: 'smiling face with smiling eyes',
    emoji: '😊',
    emoticons: [
      ':")',
      ':"]',
      ':"D',
      ':-")',
      ':-"]',
      ':-"D',
      '=")',
      '="]',
      '="D',
      '=-")',
      '=-"]',
      '=-"D'
    ],
    name: 'blush',
    tags: ['proud']
  },
  {
    description: 'broken heart',
    emoji: '💔',
    emoticons: ['<\\3', '</3'],
    name: 'broken_heart',
    tags: []
  },
  {
    description: 'confused face',
    emoji: '😕',
    emoticons: [':/', ':\\', ':-/', ':-\\', '=/', '=\\', '=-/', '=-\\'],
    name: 'confused',
    tags: []
  },
  {
    description: 'crying face',
    emoji: '😢',
    emoticons: [
      ':,(',
      ':,[',
      ':,|',
      ':,-(',
      ':,-[',
      ':,-|',
      ":'(",
      ":'[",
      ":'|",
      ":'-(",
      ":'-[",
      ":'-|",
      '=,(',
      '=,[',
      '=,|',
      '=,-(',
      '=,-[',
      '=,-|',
      "='(",
      "='[",
      "='|",
      "='-(",
      "='-[",
      "='-|",
      'T-T'
    ],
    name: 'cry',
    tags: ['sad', 'tear']
  },
  {
    description: 'frowning face with open mouth',
    emoji: '😦',
    emoticons: [':(', ':[', ':-(', ':-[', '=(', '=[', '=-(', '=-['],
    name: 'frowning',
    tags: []
  },
  {
    description: 'red heart',
    emoji: '❤️',
    emoticons: ['<3'],
    name: 'heart',
    tags: ['love']
  },
  {
    description: 'angry face with horns',
    emoji: '👿',
    emoticons: [']:(', ']:[', ']:-(', ']:-[', ']=(', ']=[', ']=-(', ']=-['],
    name: 'imp',
    tags: ['angry', 'devil', 'evil', 'horns']
  },
  {
    description: 'smiling face with halo',
    emoji: '😇',
    emoticons: [
      'o:)',
      'o:]',
      'o:D',
      'o:-)',
      'o:-]',
      'o:-D',
      'o=)',
      'o=]',
      'o=D',
      'o=-)',
      'o=-]',
      'o=-D',
      'O:)',
      'O:]',
      'O:D',
      'O:-)',
      'O:-]',
      'O:-D',
      'O=)',
      'O=]',
      'O=D',
      'O=-)',
      'O=-]',
      'O=-D',
      '0:)',
      '0:]',
      '0:D',
      '0:-)',
      '0:-]',
      '0:-D',
      '0=)',
      '0=]',
      '0=D',
      '0=-)',
      '0=-]',
      '0=-D'
    ],
    name: 'innocent',
    tags: ['angel']
  },
  {
    description: 'face with tears of joy',
    emoji: '😂',
    emoticons: [
      ':,)',
      ':,]',
      ':,D',
      ':,-)',
      ':,-]',
      ':,-D',
      ":')",
      ":']",
      ":'D",
      ":'-)",
      ":'-]",
      ":'-D",
      '=,)',
      '=,]',
      '=,D',
      '=,-)',
      '=,-]',
      '=,-D',
      "=')",
      "=']",
      "='D",
      "='-)",
      "='-]",
      "='-D"
    ],
    name: 'joy',
    tags: ['tears']
  },
  {
    description: 'kissing face',
    emoji: '😗',
    emoticons: [':*', ':-*', '=*', '=-*'],
    name: 'kissing',
    tags: []
  },
  {
    description: 'grinning squinting face',
    emoji: '😆',
    emoticons: [
      'x)',
      'x]',
      'xD',
      'x-)',
      'x-]',
      'x-D',
      'X)',
      'X]',
      'X-)',
      'X-]',
      'X-D'
    ],
    name: 'laughing',
    tags: ['happy', 'haha']
  },
  {
    description: 'man',
    emoji: '👨',
    emoticons: [
      ':3',
      ':-3',
      '=3',
      '=-3',
      ';3',
      ';-3',
      'x3',
      'x-3',
      'X3',
      'X-3'
    ],
    name: 'man',
    tags: ['mustache', 'father', 'dad']
  },
  {
    description: 'neutral face',
    emoji: '😐',
    emoticons: [':|', ':-|', '=|', '=-|'],
    name: 'neutral_face',
    tags: ['meh']
  },
  {
    description: 'face without mouth',
    emoji: '😶',
    emoticons: [':-'],
    name: 'no_mouth',
    tags: ['mute', 'silence']
  },
  {
    description: 'face with open mouth',
    emoji: '😮',
    emoticons: [
      ':o',
      ':O',
      ':0',
      ':-o',
      ':-O',
      ':-0',
      '=o',
      '=O',
      '=0',
      '=-o',
      '=-O',
      '=-0'
    ],
    name: 'open_mouth',
    tags: ['surprise', 'impressed', 'wow']
  },
  {
    description: 'enraged face',
    emoji: '😡',
    emoticons: [':@', ':-@', '=@', '=-@'],
    name: 'rage',
    tags: ['angry']
  },
  {
    description: 'grinning face with smiling eyes',
    emoji: '😄',
    emoticons: [':D', ':-D', '=D', '=-D'],
    name: 'smile',
    tags: ['happy', 'joy', 'laugh', 'pleased']
  },
  {
    description: 'grinning face with big eyes',
    emoji: '😃',
    emoticons: [':)', ':]', ':-)', ':-]', '=)', '=]', '=-)', '=-]'],
    name: 'smiley',
    tags: ['happy', 'joy', 'haha']
  },
  {
    description: 'smiling face with horns',
    emoji: '😈',
    emoticons: [
      ']:)',
      ']:]',
      ']:D',
      ']:-)',
      ']:-]',
      ']:-D',
      ']=)',
      ']=]',
      ']=D',
      ']=-)',
      ']=-]',
      ']=-D'
    ],
    name: 'smiling_imp',
    tags: ['devil', 'evil', 'horns']
  },
  {
    description: 'loudly crying face',
    emoji: '😭',
    emoticons: [
      ":,'(",
      ":,'[",
      ":,'-(",
      ":,'-[",
      ":',(",
      ":',[",
      ":',-(",
      ":',-[",
      "=,'(",
      "=,'[",
      "=,'-(",
      "=,'-[",
      "=',(",
      "=',[",
      "=',-(",
      "=',-["
    ],
    name: 'sob',
    tags: ['sad', 'cry', 'bawling']
  },
  {
    description: 'face with tongue',
    emoji: '😛',
    emoticons: [
      ':p',
      ':P',
      ':d',
      ':-p',
      ':-P',
      ':-d',
      '=p',
      '=P',
      '=d',
      '=-p',
      '=-P',
      '=-d'
    ],
    name: 'stuck_out_tongue',
    tags: []
  },
  {
    description: 'squinting face with tongue',
    emoji: '😝',
    emoticons: ['xP', 'x-p', 'x-P', 'x-d', 'Xp', 'Xd', 'X-p', 'X-P', 'X-d'],
    name: 'stuck_out_tongue_closed_eyes',
    tags: ['prank']
  },
  {
    description: 'winking face with tongue',
    emoji: '😜',
    emoticons: [';p', ';P', ';d', ';-p', ';-P', ';-d'],
    name: 'stuck_out_tongue_winking_eye',
    tags: ['prank', 'silly']
  },
  {
    description: 'smiling face with sunglasses',
    emoji: '😎',
    emoticons: [
      '8)',
      '8]',
      '8D',
      '8-)',
      '8-]',
      '8-D',
      'B)',
      'B]',
      'B-)',
      'B-]',
      'B-D'
    ],
    name: 'sunglasses',
    tags: ['cool']
  },
  {
    description: 'downcast face with sweat',
    emoji: '😓',
    emoticons: [
      ',:(',
      ',:[',
      ',:-(',
      ',:-[',
      ',=(',
      ',=[',
      ',=-(',
      ',=-[',
      "':(",
      "':[",
      "':-(",
      "':-[",
      "'=(",
      "'=[",
      "'=-(",
      "'=-["
    ],
    name: 'sweat',
    tags: []
  },
  {
    description: 'grinning face with sweat',
    emoji: '😅',
    emoticons: [
      ',:)',
      ',:]',
      ',:D',
      ',:-)',
      ',:-]',
      ',:-D',
      ',=)',
      ',=]',
      ',=D',
      ',=-)',
      ',=-]',
      ',=-D',
      "':)",
      "':]",
      "':D",
      "':-)",
      "':-]",
      "':-D",
      "'=)",
      "'=]",
      "'=D",
      "'=-)",
      "'=-]",
      "'=-D"
    ],
    name: 'sweat_smile',
    tags: ['hot']
  },
  {
    description: 'unamused face',
    emoji: '😒',
    emoticons: [
      ':$',
      ':s',
      ':z',
      ':S',
      ':Z',
      ':-$',
      ':-s',
      ':-z',
      ':-S',
      ':-Z',
      '=$',
      '=s',
      '=z',
      '=S',
      '=Z',
      '=-$',
      '=-s',
      '=-z',
      '=-S',
      '=-Z'
    ],
    name: 'unamused',
    tags: ['meh']
  },
  {
    description: 'winking face',
    emoji: '😉',
    emoticons: [';)', ';]', ';D', ';-)', ';-]', ';-D'],
    name: 'wink',
    tags: ['flirt']
  }
]
