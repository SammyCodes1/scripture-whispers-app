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
      { ref: 'Galatians 2:20', text: 'I am crucified with Christ: nevertheless I live; yet not I, but Christ liveth in me: and the life which I now live in the flesh I live by the faith of the Son of God, who loved me, and gave himself for me.', testament: 'NT' },
      { ref: '2 Corinthians 5:7', text: 'For we walk by faith, not by sight.', testament: 'NT' },
      { ref: 'Matthew 17:20', text: 'If ye have faith as a grain of mustard seed, ye shall say unto this mountain, Remove hence to yonder place; and it shall remove; and nothing shall be impossible unto you.', testament: 'NT' },
      { ref: 'Proverbs 3:5-6', text: 'Trust in the Lord with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.', testament: 'OT' },
      { ref: 'Hebrews 11:6', text: 'But without faith it is impossible to please him: for he that cometh to God must believe that he is, and that he is a rewarder of them that diligently seek him.', testament: 'NT' },
      { ref: 'Genesis 15:6', text: 'And he believed in the Lord; and he counted it to him for righteousness.', testament: 'OT' },
      { ref: 'James 2:17', text: 'Even so faith, if it hath not works, is dead, being alone.', testament: 'NT' },
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
      { ref: 'Romans 8:38-39', text: 'For I am persuaded, that neither death, nor life, nor angels, nor principalities, nor powers, nor things present, nor things to come, Nor height, nor depth, nor any other creature, shall be able to separate us from the love of God, which is in Christ Jesus our Lord.', testament: 'NT' },
      { ref: '1 John 4:19', text: 'We love him, because he first loved us.', testament: 'NT' },
      { ref: 'John 15:13', text: 'Greater love hath no man than this, that a man lay down his life for his friends.', testament: 'NT' },
      { ref: 'Psalm 136:26', text: 'O give thanks unto the God of heaven: for his mercy endureth for ever.', testament: 'OT' },
      { ref: 'Mark 12:31', text: 'Thou shalt love thy neighbour as thyself. There is none other commandment greater than these.', testament: 'NT' },
      { ref: '1 Corinthians 13:13', text: 'And now abideth faith, hope, charity, these three; but the greatest of these is charity.', testament: 'NT' },
      { ref: 'Leviticus 19:18', text: 'Thou shalt not avenge, nor bear any grudge against the children of thy people, but thou shalt love thy neighbour as thyself: I am the Lord.', testament: 'OT' },
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
      { ref: 'James 5:16', text: 'The effectual fervent prayer of a righteous man availeth much.', testament: 'NT' },
      { ref: 'Matthew 7:7', text: 'Ask, and it shall be given you; seek, and ye shall find; knock, and it shall be opened unto you.', testament: 'NT' },
      { ref: 'Psalm 34:17', text: 'The righteous cry, and the Lord heareth, and delivereth them out of all their troubles.', testament: 'OT' },
      { ref: 'Romans 8:26', text: 'Likewise the Spirit also helpeth our infirmities: for we know not what we should pray for as we ought: but the Spirit itself maketh intercession for us with groanings which cannot be uttered.', testament: 'NT' },
      { ref: '2 Chronicles 7:14', text: 'If my people, which are called by my name, shall humble themselves, and pray, and seek my face, and turn from their wicked ways; then will I hear from heaven, and will forgive their sin, and will heal their land.', testament: 'OT' },
      { ref: 'Psalm 5:3', text: 'My voice shalt thou hear in the morning, O Lord; in the morning will I direct my prayer unto thee, and will look up.', testament: 'OT' },
      { ref: 'Luke 18:1', text: 'And he spake a parable unto them to this end, that men ought always to pray, and not to faint.', testament: 'NT' },
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
      { ref: 'Matthew 6:14-15', text: 'For if ye forgive men their trespasses, your heavenly Father will also forgive you: But if ye forgive not men their trespasses, neither will your Father forgive your trespasses.', testament: 'NT' },
      { ref: 'Acts 3:19', text: 'Repent ye therefore, and be converted, that your sins may be blotted out, when the times of refreshing shall come from the presence of the Lord.', testament: 'NT' },
      { ref: 'Micah 7:18-19', text: 'Who is a God like unto thee, that pardoneth iniquity, and passeth by the transgression of the remnant of his heritage? he retaineth not his anger for ever, because he delighteth in mercy.', testament: 'OT' },
      { ref: 'Luke 6:37', text: 'Judge not, and ye shall not be judged: condemn not, and ye shall not be condemned: forgive, and ye shall be forgiven.', testament: 'NT' },
      { ref: 'Psalm 32:5', text: 'I acknowledged my sin unto thee, and mine iniquity have I not hid. I said, I will confess my transgressions unto the Lord; and thou forgavest the iniquity of my sin.', testament: 'OT' },
      { ref: 'Daniel 9:9', text: 'To the Lord our God belong mercies and forgivenesses, though we have rebelled against him.', testament: 'OT' },
      { ref: 'Matthew 18:21-22', text: 'Then came Peter to him, and said, Lord, how oft shall my brother sin against me, and I forgive him? till seven times? Jesus saith unto him, I say not unto thee, Until seven times: but, Until seventy times seven.', testament: 'NT' },
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
      { ref: 'Deuteronomy 31:6', text: 'Be strong and of a good courage, fear not, nor be afraid of them: for the Lord thy God, he it is that doth go with thee; he will not fail thee, nor forsake thee.', testament: 'OT' },
      { ref: 'Joshua 1:9', text: 'Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the Lord thy God is with thee whithersoever thou goest.', testament: 'OT' },
      { ref: 'Ephesians 6:10', text: 'Finally, my brethren, be strong in the Lord, and in the power of his might.', testament: 'NT' },
      { ref: 'Psalm 46:1', text: 'God is our refuge and strength, a very present help in trouble.', testament: 'OT' },
      { ref: 'Isaiah 41:10', text: 'Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee; yea, I will uphold thee with the right hand of my righteousness.', testament: 'OT' },
      { ref: '2 Timothy 1:7', text: 'For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.', testament: 'NT' },
      { ref: 'Psalm 28:7', text: 'The Lord is my strength and my shield; my heart trusted in him, and I am helped.', testament: 'OT' },
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
      { ref: 'John 16:33', text: 'These things I have spoken unto you, that in me ye might have peace. In the world ye shall have tribulation: but be of good cheer; I have overcome the world.', testament: 'NT' },
      { ref: 'Colossians 3:15', text: 'And let the peace of God rule in your hearts, to the which also ye are called in one body; and be ye thankful.', testament: 'NT' },
      { ref: 'Psalm 4:8', text: 'I will both lay me down in peace, and sleep: for thou, Lord, only makest me dwell in safety.', testament: 'OT' },
      { ref: 'Numbers 6:26', text: 'The Lord lift up his countenance upon thee, and give thee peace.', testament: 'OT' },
      { ref: 'Matthew 5:9', text: 'Blessed are the peacemakers: for they shall be called the children of God.', testament: 'NT' },
      { ref: 'Psalm 119:165', text: 'Great peace have they which love thy law: and nothing shall offend them.', testament: 'OT' },
      { ref: '2 Thessalonians 3:16', text: 'Now the Lord of peace himself give you peace always by all means. The Lord be with you all.', testament: 'NT' },
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
      { ref: 'Hebrews 6:19', text: 'Which hope we have as an anchor of the soul, both sure and stedfast, and which entereth into that within the veil.', testament: 'NT' },
      { ref: '1 Peter 1:3', text: 'Blessed be the God and Father of our Lord Jesus Christ, which according to his abundant mercy hath begotten us again unto a lively hope by the resurrection of Jesus Christ from the dead.', testament: 'NT' },
      { ref: 'Psalm 31:24', text: 'Be of good courage, and he shall strengthen your heart, all ye that hope in the Lord.', testament: 'OT' },
      { ref: 'Isaiah 40:31', text: 'But they that wait upon the Lord shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.', testament: 'OT' },
      { ref: 'Romans 5:5', text: 'And hope maketh not ashamed; because the love of God is shed abroad in our hearts by the Holy Ghost which is given unto us.', testament: 'NT' },
      { ref: 'Titus 2:13', text: 'Looking for that blessed hope, and the glorious appearing of the great God and our Saviour Jesus Christ.', testament: 'NT' },
      { ref: 'Psalm 130:5', text: 'I wait for the Lord, my soul doth wait, and in his word do I hope.', testament: 'OT' },
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
      { ref: 'Proverbs 4:7', text: 'Wisdom is the principal thing; therefore get wisdom: and with all thy getting get understanding.', testament: 'OT' },
      { ref: 'Proverbs 2:6', text: 'For the Lord giveth wisdom: out of his mouth cometh knowledge and understanding.', testament: 'OT' },
      { ref: 'James 3:17', text: 'But the wisdom that is from above is first pure, then peaceable, gentle, and easy to be intreated, full of mercy and good fruits, without partiality, and without hypocrisy.', testament: 'NT' },
      { ref: 'Proverbs 16:16', text: 'How much better is it to get wisdom than gold! and to get understanding rather to be chosen than silver!', testament: 'OT' },
      { ref: '1 Corinthians 1:25', text: 'Because the foolishness of God is wiser than men; and the weakness of God is stronger than men.', testament: 'NT' },
      { ref: 'Psalm 111:10', text: 'The fear of the Lord is the beginning of wisdom: a good understanding have all they that do his commandments.', testament: 'OT' },
      { ref: 'Proverbs 13:20', text: 'He that walketh with wise men shall be wise: but a companion of fools shall be destroyed.', testament: 'OT' },
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
      { ref: 'Isaiah 53:5', text: 'But he was wounded for our transgressions, he was bruised for our iniquities: the chastisement of our peace was upon him; and with his stripes we are healed.', testament: 'OT' },
      { ref: 'Psalm 103:3', text: 'Who forgiveth all thine iniquities; who healeth all thy diseases.', testament: 'OT' },
      { ref: 'Matthew 9:35', text: 'And Jesus went about all the cities and villages, teaching in their synagogues, and preaching the gospel of the kingdom, and healing every sickness and every disease among the people.', testament: 'NT' },
      { ref: '1 Peter 2:24', text: 'Who his own self bare our sins in his own body on the tree, that we, being dead to sins, should live unto righteousness: by whose stripes ye were healed.', testament: 'NT' },
      { ref: 'Malachi 4:2', text: 'But unto you that fear my name shall the Sun of righteousness arise with healing in his wings.', testament: 'OT' },
      { ref: 'Proverbs 4:20-22', text: 'My son, attend to my words; incline thine ear unto my sayings. Let them not depart from thine eyes; keep them in the midst of thine heart. For they are life unto those that find them, and health to all their flesh.', testament: 'OT' },
      { ref: 'Mark 5:34', text: 'And he said unto her, Daughter, thy faith hath made thee whole; go in peace, and be whole of thy plague.', testament: 'NT' },
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
      { ref: 'Psalm 37:25', text: 'I have been young, and now am old; yet have I not seen the righteous forsaken, nor his seed begging bread.', testament: 'OT' },
      { ref: 'Malachi 3:10', text: 'Bring ye all the tithes into the storehouse, that there may be meat in mine house, and prove me now herewith, saith the Lord of hosts, if I will not open you the windows of heaven, and pour you out a blessing, that there shall not be room enough to receive it.', testament: 'OT' },
      { ref: '2 Corinthians 9:8', text: 'And God is able to make all grace abound toward you; that ye, always having all sufficiency in all things, may abound to every good work.', testament: 'NT' },
      { ref: 'Genesis 22:14', text: 'And Abraham called the name of that place Jehovahjireh: as it is said to this day, In the mount of the Lord it shall be seen.', testament: 'OT' },
      { ref: 'Romans 8:32', text: 'He that spared not his own Son, but delivered him up for us all, how shall he not with him also freely give us all things?', testament: 'NT' },
      { ref: 'Psalm 34:10', text: 'The young lions do lack, and suffer hunger: but they that seek the Lord shall not want any good thing.', testament: 'OT' },
      { ref: 'James 1:17', text: 'Every good gift and every perfect gift is from above, and cometh down from the Father of lights, with whom is no variableness, neither shadow of turning.', testament: 'NT' },
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
      { ref: 'John 14:6', text: 'Jesus saith unto him, I am the way, the truth, and the life: no man cometh unto the Father, but by me.', testament: 'NT' },
      { ref: 'Acts 16:31', text: 'Believe on the Lord Jesus Christ, and thou shalt be saved, and thy house.', testament: 'NT' },
      { ref: 'Titus 3:5', text: 'Not by works of righteousness which we have done, but according to his mercy he saved us, by the washing of regeneration, and renewing of the Holy Ghost.', testament: 'NT' },
      { ref: 'John 3:17', text: 'For God sent not his Son into the world to condemn the world; but that the world through him might be saved.', testament: 'NT' },
      { ref: 'Psalm 27:1', text: 'The Lord is my light and my salvation; whom shall I fear? the Lord is the strength of my life; of whom shall I be afraid?', testament: 'OT' },
      { ref: 'Isaiah 45:22', text: 'Look unto me, and be ye saved, all the ends of the earth: for I am God, and there is none else.', testament: 'OT' },
      { ref: 'Romans 6:23', text: 'For the wages of sin is death; but the gift of God is eternal life through Jesus Christ our Lord.', testament: 'NT' },
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
      { ref: 'Psalm 107:1', text: 'O give thanks unto the Lord, for he is good: for his mercy endureth for ever.', testament: 'OT' },
      { ref: 'Colossians 4:2', text: 'Continue in prayer, and watch in the same with thanksgiving.', testament: 'NT' },
      { ref: 'Psalm 95:2', text: 'Let us come before his presence with thanksgiving, and make a joyful noise unto him with psalms.', testament: 'OT' },
      { ref: 'Philippians 4:6', text: 'Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.', testament: 'NT' },
      { ref: '1 Chronicles 16:34', text: 'O give thanks unto the Lord; for he is good; for his mercy endureth for ever.', testament: 'OT' },
      { ref: 'Hebrews 12:28', text: 'Wherefore we receiving a kingdom which cannot be moved, let us have grace, whereby we may serve God acceptably with reverence and godly fear.', testament: 'NT' },
      { ref: 'Psalm 69:30', text: 'I will praise the name of God with a song, and will magnify him with thanksgiving.', testament: 'OT' },
    ]
  },
  {
    id: 'courage',
    name: 'Courage',
    emoji: '🦁',
    description: 'Being bold and fearless in God',
    verses: [
      { ref: 'Joshua 1:9', text: 'Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the Lord thy God is with thee whithersoever thou goest.', testament: 'OT' },
      { ref: 'Deuteronomy 31:6', text: 'Be strong and of a good courage, fear not, nor be afraid of them: for the Lord thy God, he it is that doth go with thee; he will not fail thee, nor forsake thee.', testament: 'OT' },
      { ref: '2 Timothy 1:7', text: 'For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind.', testament: 'NT' },
      { ref: 'Isaiah 41:10', text: 'Fear thou not; for I am with thee: be not dismayed; for I am thy God: I will strengthen thee; yea, I will help thee.', testament: 'OT' },
      { ref: 'Psalm 56:3', text: 'What time I am afraid, I will trust in thee.', testament: 'OT' },
      { ref: '1 Corinthians 16:13', text: 'Watch ye, stand fast in the faith, quit you like men, be strong.', testament: 'NT' },
      { ref: 'Psalm 27:14', text: 'Wait on the Lord: be of good courage, and he shall strengthen thine heart: wait, I say, on the Lord.', testament: 'OT' },
      { ref: 'Acts 4:31', text: 'And when they had prayed, the place was shaken where they were assembled together; and they were all filled with the Holy Ghost, and they spake the word of God with boldness.', testament: 'NT' },
      { ref: 'Proverbs 28:1', text: 'The wicked flee when no man pursueth: but the righteous are bold as a lion.', testament: 'OT' },
      { ref: 'Romans 8:31', text: 'What shall we then say to these things? If God be for us, who can be against us?', testament: 'NT' },
      { ref: 'Psalm 31:24', text: 'Be of good courage, and he shall strengthen your heart, all ye that hope in the Lord.', testament: 'OT' },
      { ref: 'Hebrews 13:6', text: 'So that we may boldly say, The Lord is my helper, and I will not fear what man shall do unto me.', testament: 'NT' },
    ]
  },
  {
    id: 'obedience',
    name: 'Obedience',
    emoji: '📜',
    description: 'Walking in obedience to God\'s Word',
    verses: [
      { ref: 'John 14:15', text: 'If ye love me, keep my commandments.', testament: 'NT' },
      { ref: 'Deuteronomy 28:1', text: 'And it shall come to pass, if thou shalt hearken diligently unto the voice of the Lord thy God, to observe and to do all his commandments which I command thee this day, that the Lord thy God will set thee on high above all nations of the earth.', testament: 'OT' },
      { ref: '1 Samuel 15:22', text: 'Behold, to obey is better than sacrifice, and to hearken than the fat of rams.', testament: 'OT' },
      { ref: 'James 1:22', text: 'But be ye doers of the word, and not hearers only, deceiving your own selves.', testament: 'NT' },
      { ref: 'Acts 5:29', text: 'Then Peter and the other apostles answered and said, We ought to obey God rather than men.', testament: 'NT' },
      { ref: 'Psalm 119:105', text: 'Thy word is a lamp unto my feet, and a light unto my path.', testament: 'OT' },
      { ref: 'John 15:10', text: 'If ye keep my commandments, ye shall abide in my love; even as I have kept my Father\'s commandments, and abide in his love.', testament: 'NT' },
      { ref: 'Deuteronomy 5:33', text: 'Ye shall walk in all the ways which the Lord your God hath commanded you, that ye may live, and that it may be well with you.', testament: 'OT' },
      { ref: 'Romans 6:16', text: 'Know ye not, that to whom ye yield yourselves servants to obey, his servants ye are to whom ye obey; whether of sin unto death, or of obedience unto righteousness?', testament: 'NT' },
      { ref: 'Proverbs 3:1-2', text: 'My son, forget not my law; but let thine heart keep my commandments: For length of days, and long life, and peace, shall they add to thee.', testament: 'OT' },
    ]
  },
  {
    id: 'joy',
    name: 'Joy',
    emoji: '😊',
    description: 'The joy of the Lord',
    verses: [
      { ref: 'Nehemiah 8:10', text: 'The joy of the Lord is your strength.', testament: 'OT' },
      { ref: 'Psalm 16:11', text: 'Thou wilt shew me the path of life: in thy presence is fulness of joy; at thy right hand there are pleasures for evermore.', testament: 'OT' },
      { ref: 'John 15:11', text: 'These things have I spoken unto you, that my joy might remain in you, and that your joy might be full.', testament: 'NT' },
      { ref: 'Romans 15:13', text: 'Now the God of hope fill you with all joy and peace in believing, that ye may abound in hope, through the power of the Holy Ghost.', testament: 'NT' },
      { ref: 'Galatians 5:22', text: 'But the fruit of the Spirit is love, joy, peace, longsuffering, gentleness, goodness, faith.', testament: 'NT' },
      { ref: 'Psalm 30:5', text: 'Weeping may endure for a night, but joy cometh in the morning.', testament: 'OT' },
      { ref: 'James 1:2', text: 'My brethren, count it all joy when ye fall into divers temptations.', testament: 'NT' },
      { ref: 'Habakkuk 3:18', text: 'Yet I will rejoice in the Lord, I will joy in the God of my salvation.', testament: 'OT' },
      { ref: 'Philippians 4:4', text: 'Rejoice in the Lord alway: and again I say, Rejoice.', testament: 'NT' },
      { ref: 'Isaiah 61:10', text: 'I will greatly rejoice in the Lord, my soul shall be joyful in my God.', testament: 'OT' },
      { ref: '1 Peter 1:8', text: 'Whom having not seen, ye love; in whom, though now ye see him not, yet believing, ye rejoice with joy unspeakable and full of glory.', testament: 'NT' },
      { ref: 'Psalm 126:5', text: 'They that sow in tears shall reap in joy.', testament: 'OT' },
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
