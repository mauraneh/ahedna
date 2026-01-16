-- Script d'initialisation de l'histoire complète des Harkis
-- À exécuter dans la base de données Neon

-- Supprimer les chapitres existants (optionnel)
-- DELETE FROM history_chapters;

-- Chapitre 1: Les origines (1954-1956)
INSERT INTO history_chapters (title, content, chapter_order, year_start, year_end, media_urls, coordinates) VALUES
('Les Origines : L''engagement des Harkis', 
'En 1954, alors que la guerre d''Algérie éclate, de nombreux Algériens musulmans choisissent de s''engager aux côtés de la France. Ces hommes, appelés "harkis" (du mot arabe "harka" signifiant mouvement), sont recrutés comme auxiliaires de l''armée française. Ils servent dans des unités spéciales, les "harkas", et participent aux opérations de maintien de l''ordre et de pacification.

Leur engagement est motivé par diverses raisons : fidélité à la France, opposition au FLN, espoir d''une Algérie française, ou simplement la nécessité économique. Ces hommes, souvent issus de milieux ruraux, voient dans cet engagement une opportunité de servir et de protéger leurs familles.

Entre 1954 et 1962, environ 200 000 à 250 000 harkis servent dans les rangs de l''armée française, formant une force essentielle dans la lutte contre l''insurrection nationaliste.',
1, 1954, 1956, '[]', '{}');

-- Chapitre 2: L'intensification du conflit (1957-1960)
INSERT INTO history_chapters (title, content, chapter_order, year_start, year_end, media_urls, coordinates) VALUES
('L''Intensification : Au cœur du conflit', 
'À partir de 1957, le conflit s''intensifie. Les harkis sont de plus en plus impliqués dans les opérations militaires. Ils connaissent le terrain, la langue, les coutumes locales, ce qui en fait des auxiliaires précieux pour l''armée française.

Ils participent aux grandes opérations comme la bataille d''Alger, les opérations de ratissage dans les djebels, et la construction de barrages frontaliers. Leur rôle est crucial dans la collecte de renseignements et la lutte contre les maquis du FLN.

Cependant, cette période est aussi marquée par une escalade de la violence. Les harkis et leurs familles deviennent des cibles privilégiées du FLN, qui les considère comme des traîtres. Les représailles sont terribles : assassinats, mutilations, et massacres de familles entières.

Malgré ces risques, les harkis continuent de servir avec courage et détermination, souvent au péril de leur vie et de celle de leurs proches.',
2, 1957, 1960, '[]', '{}');

-- Chapitre 3: Les Accords d'Évian et l'abandon (1961-1962)
INSERT INTO history_chapters (title, content, chapter_order, year_start, year_end, media_urls, coordinates) VALUES
('L''Abandon : Les Accords d''Évian et leurs conséquences', 
'Le 18 mars 1962, les Accords d''Évian mettent fin à la guerre d''Algérie. L''indépendance de l''Algérie est proclamée, mais ces accords ne prévoient aucune protection pour les harkis et leurs familles.

Face à cette situation, l''armée française reçoit l''ordre de ne pas rapatrier les harkis. Seulement quelques milliers parviennent à quitter l''Algérie clandestinement ou grâce à l''aide de certains officiers français qui désobéissent aux ordres.

Pour la grande majorité des harkis, c''est l''abandon. Ils sont désarmés, livrés à eux-mêmes dans une Algérie indépendante où ils sont considérés comme des traîtres. Les représailles commencent immédiatement après l''indépendance.

Entre avril et septembre 1962, des dizaines de milliers de harkis sont massacrés, souvent dans des conditions atroces. Les estimations varient entre 30 000 et 150 000 morts. Les survivants et leurs familles vivent dans la terreur, cachés ou contraints de fuir.',
3, 1961, 1962, '[]', '{}');

-- Chapitre 4: L'exil et les camps (1962-1975)
INSERT INTO history_chapters (title, content, chapter_order, year_start, year_end, media_urls, coordinates) VALUES
('L''Exil : Les camps de transit et d''hébergement', 
'Les harkis qui parviennent à quitter l''Algérie arrivent en France dans des conditions dramatiques. Ils sont d''abord parqués dans des camps de transit improvisés, puis dans des camps d''hébergement comme Rivesaltes, Bias, ou Saint-Maurice-l''Ardoise.

Ces camps, souvent d''anciens camps militaires ou des baraquements précaires, accueillent des familles entières dans des conditions de vie très difficiles. L''isolement, la promiscuité, le manque d''hygiène et de confort marquent profondément cette génération.

Les harkis et leurs familles vivent dans ces camps pendant des années, parfois plus de dix ans. Les enfants grandissent dans ces conditions, privés d''éducation normale et confrontés à la discrimination et au rejet.

Malgré ces difficultés, les harkis tentent de reconstruire leur vie. Ils travaillent dans les usines, les chantiers, l''agriculture, acceptant les travaux les plus pénibles pour subvenir aux besoins de leurs familles.',
4, 1962, 1975, '[]', '{}');

-- Chapitre 5: La reconnaissance progressive (1975-2000)
INSERT INTO history_chapters (title, content, chapter_order, year_start, year_end, media_urls, coordinates) VALUES
('La Reconnaissance : Vers une mémoire officielle', 
'À partir des années 1970, la situation commence lentement à évoluer. Les enfants de harkis, nés en France, s''organisent et réclament la reconnaissance de l''histoire de leurs parents.

En 1975, une première loi est votée pour améliorer le sort des harkis, mais elle reste insuffisante. Les associations se multiplient pour défendre leurs droits et faire connaître leur histoire.

Les années 1980 et 1990 voient une prise de conscience progressive. Des historiens commencent à écrire sur cette page oubliée de l''histoire. Les médias s''intéressent à cette communauté longtemps silencieuse.

En 1994, une loi reconnaît officiellement les harkis comme "rapatriés d''origine nord-africaine". Des mesures sont prises pour améliorer leur situation sociale et économique, mais beaucoup reste à faire.',
5, 1975, 2000, '[]', '{}');

-- Chapitre 6: La reconnaissance officielle (2001-2012)
INSERT INTO history_chapters (title, content, chapter_order, year_start, year_end, media_urls, coordinates) VALUES
('La Reconnaissance Officielle : De la mémoire à l''histoire', 
'Le 25 septembre 2001, le président Jacques Chirac reconnaît officiellement la "dette d''honneur" de la France envers les harkis. Cette reconnaissance historique marque un tournant dans l''histoire de cette communauté.

En 2005, une loi crée un fonds d''indemnisation pour les harkis et leurs descendants. Des mesures sont prises pour améliorer leur insertion sociale et professionnelle.

Le 14 avril 2012, le président Nicolas Sarkozy reconnaît la "responsabilité de la France" dans l''abandon des harkis. Cette reconnaissance, attendue depuis cinquante ans, est un moment émotionnel fort pour toute la communauté.

Des monuments commémoratifs sont érigés dans plusieurs villes de France. Des cérémonies officielles sont organisées chaque 25 septembre, journée nationale d''hommage aux harkis.',
6, 2001, 2012, '[]', '{}');

-- Chapitre 7: La transmission et l'avenir (2013-aujourd'hui)
INSERT INTO history_chapters (title, content, chapter_order, year_start, year_end, media_urls, coordinates) VALUES
('La Transmission : Préserver la mémoire pour l''avenir', 
'Aujourd''hui, la communauté des harkis et de leurs descendants compte plusieurs centaines de milliers de personnes en France. La troisième et quatrième générations portent cette mémoire et continuent de se battre pour la reconnaissance et la transmission.

Les associations, comme l''AHEDNA, jouent un rôle essentiel dans la préservation de cette mémoire. Elles organisent des commémorations, des conférences, des expositions, et travaillent à faire connaître cette histoire aux jeunes générations.

L''enjeu aujourd''hui est la transmission : transmettre cette histoire aux enfants et petits-enfants, mais aussi à toute la société française. Il s''agit de faire connaître cette page de l''histoire, de comprendre les souffrances vécues, mais aussi de valoriser le courage et la fidélité des harkis.

L''avenir passe par l''éducation, la mémoire, et la reconnaissance. Les descendants des harkis sont aujourd''hui pleinement français, mais ils portent en eux cette histoire qui fait partie intégrante de leur identité et de l''histoire de France.',
7, 2013, 2025, '[]', '{}');

-- Vérification
SELECT * FROM history_chapters ORDER BY chapter_order;