export interface TopicVerse {
  ref: string;
  text: string;
  testament: 'OT' | 'NT';
}

export interface Topic {
  id: string;
  name: string;
  emoji: string;
  description: string;
  verses: TopicVerse[];
}

export const TOPICS: Topic[] = [
  {
    id: 'faith',
    name: 'Faith',
    emoji: '✝️',
    description: 'Trusting in God and His promises',
    verses: [
      { ref: 'Hebrews 11:1', text: 'Now faith is the substance of things hoped for, the evidence of things not seen.', testament: 'NT' },
      { ref: 'Romans 10:17', text: 'So then faith cometh by hearing, and hearing by the word of God.', testament: 'NT' },
      { ref: 'Habakkuk 2:4', text: 'Behold, his soul which is lifted up is not upright in him: but the just shall live by his faith.', testament: 'OT' },
      { ref: 'Mark 11:22-23', text: 'And Jesus answering saith unto them, Have faith in God. For verily I say unto you, That whosoever shall say unto this mountain, Be thou removed, and be thou cast into the sea; and shall not doubt in his heart, but shall believe that those things which he saith shall come to pass; he shall have whatsoever he saith.', testament: 'NT' },
      { ref: 'Psalm 27:13', text: 'I had fainted, unless I had believed to see the goodness of the Lord in the land of the living.', testament: 'OT' },
    ]
  },
  {
    id: 'love',
    name: 'Love',
    emoji: '❤️',
    description: 'God\'s love and loving others',
    verses: [
      { ref: '1 Corinthians 13:4-7', text: 'Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up.', testament: 'NT' },
      { ref: 'John 3:16', text: 'For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.', testament: 'NT' },
      { ref: '1 John 4:8', text: 'He that loveth not knoweth not God; for God is love.', testament: 'NT' },
      { ref: 'Song of Solomon 8:7', text: 'Many waters cannot quench love, neither can the floods drown it.', testament: 'OT' },
      { ref: 'Deuteronomy 6:5', text: 'And thou shalt love the Lord thy God with all thine heart, and with all thy soul, and with all thy might.', testament: 'OT' },
    ]
  },
  {
    id: 'prayer',
    name: 'Prayer',
    emoji: '🙏',
    description: 'Communicating with God',
    verses: [
      { ref: 'Philippians 4:6', text: 'Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.', testament: 'NT' },
      { ref: '1 Thessalonians 5:17', text: 'Pray without ceasing.', testament: 'NT' },
      { ref: 'Psalm 145:18', text: 'The Lord is nigh unto all them that call upon him, to all that call upon him in truth.', testament: 'OT' },
      { ref: 'Matthew 6:6', text: 'But thou, when thou prayest, enter into thy closet, and when thou hast shut thy door, pray to thy Father which is in secret; and thy Father which seeth in secret shall reward thee openly.', testament: 'NT' },
      { ref: 'Jeremiah 33:3', text: 'Call unto me, and I will answer thee, and shew thee great and mighty things, which thou knowest not.', testament: 'OT' },
    ]
  },
  {
    id: 'forgiveness',
    name: 'Forgiveness',
    emoji: '🕊️',
    description: 'God\'s mercy and forgiving others',
    verses: [
      { ref: 'Ephesians 4:32', text: 'And be ye kind one to another, tenderhearted, forgiving one another, even as God for Christ\'s sake hath forgiven you.', testament: 'NT' },
      { ref: 'Colossians 3:13', text: 'Forbearing one another, and forgiving one another, if any man have a quarrel against any: even as Christ forgave you, so also do ye.', testament: 'NT' },
      { ref: 'Psalm 103:12', text: 'As far as the east is from the west, so far hath he removed our transgressions from us.', testament: 'OT' },
      { ref: '1 John 1:9', text: 'If we confess our sins, he is faithful and just to forgive us our sins, and to cleanse us from all unrighteousness.', testament: 'NT' },
      { ref: 'Isaiah 1:18', text: 'Come now, and let us reason together, saith the Lord: though your sins be as scarlet, they shall be as white as snow.', testament: 'OT' },
    ]
  },
  {
    id: 'strength',
    name: 'Strength',
    emoji: '💪',
    description: 'Finding strength in God',
    verses: [
      { ref: 'Philippians 4:13', text: 'I can do all things through Christ which strengtheneth me.', testament: 'NT' },
      { ref: 'Isaiah 40:31', text: 'But they that wait upon the Lord shall renew their strength; they shall mount up with wings as eagles.', testament: 'OT' },
      { ref: '2 Corinthians 12:9', text: 'And he said unto me, My grace is sufficient for thee: for my strength is made perfect in weakness.', testament: 'NT' },
      { ref: 'Psalm 18:2', text: 'The Lord is my rock, and my fortress, and my deliverer; my God, my strength, in whom I will trust.', testament: 'OT' },
      { ref: 'Nehemiah 8:10', text: 'The joy of the Lord is your strength.', testament: 'OT' },
    ]
  },
  {
    id: 'peace',
    name: 'Peace',
    emoji: '☮️',
    description: 'The peace that surpasses understanding',
    verses: [
      { ref: 'Philippians 4:7', text: 'And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus.', testament: 'NT' },
      { ref: 'John 14:27', text: 'Peace I leave with you, my peace I give unto you: not as the world giveth, give I unto you.', testament: 'NT' },
      { ref: 'Isaiah 26:3', text: 'Thou wilt keep him in perfect peace, whose mind is stayed on thee: because he trusteth in thee.', testament: 'OT' },
      { ref: 'Psalm 29:11', text: 'The Lord will give strength unto his people; the Lord will bless his people with peace.', testament: 'OT' },
      { ref: 'Romans 15:13', text: 'Now the God of hope fill you with all joy and peace in believing.', testament: 'NT' },
    ]
  },
  {
    id: 'hope',
    name: 'Hope',
    emoji: '🌟',
    description: 'Eternal hope in Christ',
    verses: [
      { ref: 'Jeremiah 29:11', text: 'For I know the thoughts that I think toward you, saith the Lord, thoughts of peace, and not of evil, to give you an expected end.', testament: 'OT' },
      { ref: 'Romans 15:13', text: 'Now the God of hope fill you with all joy and peace in believing, that ye may abound in hope.', testament: 'NT' },
      { ref: 'Psalm 42:11', text: 'Why art thou cast down, O my soul? hope thou in God: for I shall yet praise him.', testament: 'OT' },
      { ref: 'Romans 8:24-25', text: 'For we are saved by hope: but hope that is seen is not hope: for what a man seeth, why doth he yet hope for?', testament: 'NT' },
      { ref: 'Lamentations 3:24', text: 'The Lord is my portion, saith my soul; therefore will I hope in him.', testament: 'OT' },
    ]
  },
  {
    id: 'wisdom',
    name: 'Wisdom',
    emoji: '📖',
    description: 'Seeking divine wisdom',
    verses: [
      { ref: 'James 1:5', text: 'If any of you lack wisdom, let him ask of God, that giveth to all men liberally, and upbraideth not; and it shall be given him.', testament: 'NT' },
      { ref: 'Proverbs 9:10', text: 'The fear of the Lord is the beginning of wisdom: and the knowledge of the holy is understanding.', testament: 'OT' },
      { ref: 'Proverbs 3:13', text: 'Happy is the man that findeth wisdom, and the man that getteth understanding.', testament: 'OT' },
      { ref: 'Colossians 3:16', text: 'Let the word of Christ dwell in you richly in all wisdom.', testament: 'NT' },
      { ref: 'Ecclesiastes 7:12', text: 'For wisdom is a defence, and money is a defence: but the excellency of knowledge is, that wisdom giveth life to them that have it.', testament: 'OT' },
    ]
  },
  {
    id: 'healing',
    name: 'Healing',
    emoji: '💊',
    description: 'God\'s healing power',
    verses: [
      { ref: 'Jeremiah 17:14', text: 'Heal me, O Lord, and I shall be healed; save me, and I shall be saved: for thou art my praise.', testament: 'OT' },
      { ref: 'James 5:15', text: 'And the prayer of faith shall save the sick, and the Lord shall raise him up.', testament: 'NT' },
      { ref: 'Psalm 147:3', text: 'He healeth the broken in heart, and bindeth up their wounds.', testament: 'OT' },
      { ref: '3 John 1:2', text: 'Beloved, I wish above all things that thou mayest prosper and be in health, even as thy soul prospereth.', testament: 'NT' },
      { ref: 'Exodus 15:26', text: 'I am the Lord that healeth thee.', testament: 'OT' },
    ]
  },
  {
    id: 'provision',
    name: 'God\'s Provision',
    emoji: '🍞',
    description: 'God provides for His children',
    verses: [
      { ref: 'Matthew 6:33', text: 'But seek ye first the kingdom of God, and his righteousness; and all these things shall be added unto you.', testament: 'NT' },
      { ref: 'Philippians 4:19', text: 'But my God shall supply all your need according to his riches in glory by Christ Jesus.', testament: 'NT' },
      { ref: 'Psalm 23:1', text: 'The Lord is my shepherd; I shall not want.', testament: 'OT' },
      { ref: 'Deuteronomy 8:18', text: 'But thou shalt remember the Lord thy God: for it is he that giveth thee power to get wealth.', testament: 'OT' },
      { ref: 'Luke 12:24', text: 'Consider the ravens: for they neither sow nor reap; which neither have storehouse nor barn; and God feedeth them: how much more are ye better than the fowls?', testament: 'NT' },
    ]
  },
  {
    id: 'salvation',
    name: 'Salvation',
    emoji: '⛪',
    description: 'The gift of eternal life',
    verses: [
      { ref: 'Romans 10:9', text: 'That if thou shalt confess with thy mouth the Lord Jesus, and shalt believe in thine heart that God hath raised him from the dead, thou shalt be saved.', testament: 'NT' },
      { ref: 'Ephesians 2:8-9', text: 'For by grace are ye saved through faith; and that not of yourselves: it is the gift of God: Not of works, lest any man should boast.', testament: 'NT' },
      { ref: 'Acts 4:12', text: 'Neither is there salvation in any other: for there is none other name under heaven given among men, whereby we must be saved.', testament: 'NT' },
      { ref: 'Isaiah 12:2', text: 'Behold, God is my salvation; I will trust, and not be afraid.', testament: 'OT' },
      { ref: 'Psalm 62:1', text: 'Truly my soul waiteth upon God: from him cometh my salvation.', testament: 'OT' },
    ]
  },
  {
    id: 'gratitude',
    name: 'Gratitude',
    emoji: '🙌',
    description: 'Giving thanks to God',
    verses: [
      { ref: '1 Thessalonians 5:18', text: 'In every thing give thanks: for this is the will of God in Christ Jesus concerning you.', testament: 'NT' },
      { ref: 'Psalm 100:4', text: 'Enter into his gates with thanksgiving, and into his courts with praise: be thankful unto him, and bless his name.', testament: 'OT' },
      { ref: 'Colossians 3:15', text: 'And let the peace of God rule in your hearts, to the which also ye are called in one body; and be ye thankful.', testament: 'NT' },
      { ref: 'Psalm 136:1', text: 'O give thanks unto the Lord; for he is good: for his mercy endureth for ever.', testament: 'OT' },
      { ref: 'Ephesians 5:20', text: 'Giving thanks always for all things unto God and the Father in the name of our Lord Jesus Christ.', testament: 'NT' },
    ]
  },
];

export const DAILY_TOPICS = [
  'Walking in Faith', 'The Power of Prayer', 'God\'s Unfailing Love',
  'Trusting God\'s Plan', 'The Armor of God', 'Living with Purpose',
  'Grace and Mercy', 'Overcoming Fear', 'Fruits of the Spirit',
  'Spiritual Growth', 'The Good Shepherd', 'Renewed Strength',
  'Light of the World', 'The Living Water', 'God\'s Faithfulness',
];

export function getDailyTopic() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return DAILY_TOPICS[dayOfYear % DAILY_TOPICS.length];
}
