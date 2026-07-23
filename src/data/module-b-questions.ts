export type ModuleBSubject = 'Mathematics' | 'Science' | 'Computer';
export type ModuleBDifficulty = 'Easy' | 'Medium' | 'Hard';

export interface ModuleBQuestion {
  id: string;
  subject: ModuleBSubject;
  difficulty: ModuleBDifficulty;
  topic: string;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
  sourceRow?: number;
}

const makeQuestion = (
  id: string,
  subject: ModuleBSubject,
  difficulty: ModuleBDifficulty,
  topic: string,
  prompt: string,
  options: [string, string, string, string],
  correctIndex: number,
  explanation: string,
  sourceRow?: number,
): ModuleBQuestion => ({
  id,
  subject,
  difficulty,
  topic,
  prompt,
  options,
  correctIndex,
  explanation,
  ...(sourceRow ? { sourceRow } : {}),
});

export const moduleBQuestions: ModuleBQuestion[] = [
  // Mathematics — Easy
  makeQuestion('math-e-01', 'Mathematics', 'Easy', 'Number Systems', 'What is the HCF of two consecutive natural numbers?', ['0', '1', '2', 'The smaller number'], 1, 'Consecutive natural numbers have no common factor greater than 1, so their HCF is 1.', 62),
  makeQuestion('math-e-02', 'Mathematics', 'Easy', 'Geometry', 'Which type of triangles are always similar to one another?', ['Right-angled triangles', 'Acute-angled triangles', 'Isosceles triangles', 'Equilateral triangles'], 3, 'Every equilateral triangle has three 60° angles, so any two are similar by the AAA rule.', 157),
  makeQuestion('math-e-03', 'Mathematics', 'Easy', 'Sequences', 'If the first term of an arithmetic progression is a and its common difference is b, what is its 10th term?', ['a + 10b', '10a + b', 'a + 9b', '9a + b'], 2, 'The nth term is a + (n − 1)b. For n = 10, this becomes a + 9b.', 167),
  makeQuestion('math-e-04', 'Mathematics', 'Easy', 'Sequences', 'What is the 20th term of the arithmetic progression −4, −7, −10, −13, …?', ['53', '56', '−61', '−64'], 2, 'Here a = −4 and d = −3. The 20th term is −4 + 19(−3) = −61.', 171),
  makeQuestion('math-e-05', 'Mathematics', 'Easy', 'Statistics', 'If the mean is 28 and the mode is 16, what is the estimated median using the empirical relation?', ['22', '23', '24', '24.5'], 2, 'Using Mode = 3 Median − 2 Mean gives Median = (16 + 56) ÷ 3 = 24.', 105),
  makeQuestion('math-e-06', 'Mathematics', 'Easy', 'Number Systems', 'What is the LCM of 4, 6 and 8?', ['12', '18', '24', '48'], 2, 'The smallest number divisible by 4, 6 and 8 is 24.'),
  makeQuestion('math-e-07', 'Mathematics', 'Easy', 'Mensuration', 'What is the total surface area of a cube with side 5 cm?', ['25 cm²', '100 cm²', '125 cm²', '150 cm²'], 3, 'A cube has six square faces, so total surface area = 6 × 5² = 150 cm².'),
  makeQuestion('math-e-08', 'Mathematics', 'Easy', 'Probability', 'A fair die is rolled once. What is the probability of getting an even number?', ['1/6', '1/3', '1/2', '2/3'], 2, 'The even outcomes are 2, 4 and 6: three favourable outcomes out of six, or 1/2.'),
  makeQuestion('math-e-09', 'Mathematics', 'Easy', 'Coordinate Geometry', 'In which quadrant does the point (−3, 4) lie?', ['First', 'Second', 'Third', 'Fourth'], 1, 'A negative x-coordinate and positive y-coordinate place the point in the second quadrant.'),
  makeQuestion('math-e-10', 'Mathematics', 'Easy', 'Percentages', 'A book marked ₹400 is sold at a 10% discount. What is its selling price?', ['₹340', '₹350', '₹360', '₹390'], 2, 'Ten percent of ₹400 is ₹40, so the selling price is ₹400 − ₹40 = ₹360.'),

  // Mathematics — Medium
  makeQuestion('math-m-01', 'Mathematics', 'Medium', 'Linear Equations', 'For what value of k do the equations kx − y − 2 = 0 and 6x − 2y − 4 = 0 have infinitely many solutions?', ['2', '3', '4', 'No such value'], 1, 'For coincident lines, corresponding coefficients are proportional. Multiplying 3x − y − 2 = 0 by 2 gives the second equation, so k = 3.'),
  makeQuestion('math-m-02', 'Mathematics', 'Medium', 'Mensuration', 'What is the total surface area of a cone with radius 7 cm and slant height 25 cm? Use π = 22/7.', ['550 cm²', '616 cm²', '704 cm²', '724 cm²'], 2, 'Total surface area = πr(l + r) = (22/7) × 7 × 32 = 704 cm².', 82),
  makeQuestion('math-m-03', 'Mathematics', 'Medium', 'Linear Equations', 'What does a pair of parallel, distinct lines represent as a system of two linear equations?', ['One solution', 'Two solutions', 'Infinitely many solutions', 'No solution'], 3, 'Distinct parallel lines never meet, so there is no ordered pair that satisfies both equations.', 146),
  makeQuestion('math-m-04', 'Mathematics', 'Medium', 'Mensuration', 'What is the total surface area of a solid hemisphere of radius 7 cm? Use π = 22/7.', ['308 cm²', '462 cm²', '616 cm²', '924 cm²'], 1, 'A solid hemisphere includes its circular base: 3πr² = 3 × 22/7 × 49 = 462 cm².', 131),
  makeQuestion('math-m-05', 'Mathematics', 'Medium', 'Statistics', 'The mean of five numbers is 18. If four numbers are 12, 16, 19 and 21, what is the fifth number?', ['20', '21', '22', '24'], 2, 'The total is 5 × 18 = 90. The four known numbers total 68, leaving 22.'),
  makeQuestion('math-m-06', 'Mathematics', 'Medium', 'Coordinate Geometry', 'What is the distance between the points (1, 2) and (4, 6)?', ['4 units', '5 units', '6 units', '7 units'], 1, 'Distance = √[(4 − 1)² + (6 − 2)²] = √(9 + 16) = 5 units.'),
  makeQuestion('math-m-07', 'Mathematics', 'Medium', 'Ratio & Proportion', 'The ratio of boys to girls is 3:5. If there are 32 students, how many are girls?', ['12', '16', '20', '24'], 2, 'There are 8 equal parts. Each part is 32 ÷ 8 = 4, so girls = 5 × 4 = 20.'),
  makeQuestion('math-m-08', 'Mathematics', 'Medium', 'Algebra', 'Solve 3(x − 2) + 4 = 19.', ['5', '6', '7', '9'], 2, 'Expanding gives 3x − 6 + 4 = 19, so 3x = 21 and x = 7.'),
  makeQuestion('math-m-09', 'Mathematics', 'Medium', 'Probability', 'A bag contains 4 red, 3 blue and 3 green balls. What is the probability of drawing a ball that is not red?', ['2/5', '1/2', '3/5', '7/10'], 2, 'Six of the ten balls are blue or green, so the probability is 6/10 = 3/5.'),
  makeQuestion('math-m-10', 'Mathematics', 'Medium', 'Sequences', 'The 8th term of an arithmetic progression is 24 and its common difference is 3. What is the first term?', ['3', '6', '21', '45'], 0, 'Using a₈ = a + 7d gives 24 = a + 21, so a = 3.'),

  // Mathematics — Hard
  makeQuestion('math-h-01', 'Mathematics', 'Hard', 'Trigonometry', 'If tan θ = 3/4 for an acute angle θ, what is sin θ?', ['3/5', '4/5', '3/4', '4/3'], 0, 'A right triangle with opposite 3 and adjacent 4 has hypotenuse 5, so sin θ = 3/5.'),
  makeQuestion('math-h-02', 'Mathematics', 'Hard', 'Trigonometry', 'A 9 m pole casts a shadow 3√3 m long. What is the angle of elevation of the Sun?', ['30°', '45°', '60°', '90°'], 2, 'tan θ = height/shadow = 9/(3√3) = √3, so θ = 60°.'),
  makeQuestion('math-h-03', 'Mathematics', 'Hard', 'Quadratic Equations', 'What are the roots of x² − 25 = 0?', ['5 only', '−5 and 5', '−25 and 25', 'No real roots'], 1, 'x² = 25, so x can be either 5 or −5.', 97),
  makeQuestion('math-h-04', 'Mathematics', 'Hard', 'Quadratic Equations', 'What is the discriminant of 2x² − 5x + 3 = 0?', ['1', '7', '13', '25'], 0, 'For ax² + bx + c = 0, D = b² − 4ac = 25 − 24 = 1.'),
  makeQuestion('math-h-05', 'Mathematics', 'Hard', 'Circle Theorems', 'A radius drawn to the point of contact of a tangent is always ______ the tangent.', ['parallel to', 'equal to', 'perpendicular to', 'a bisector of'], 2, 'The radius through the point of contact is perpendicular to the tangent.'),
  makeQuestion('math-h-06', 'Mathematics', 'Hard', 'Circle Theorems', 'In a circle of radius 21 cm, an arc subtends 60° at the centre. What is the arc length? Use π = 22/7.', ['11 cm', '21 cm', '22 cm', '44 cm'], 2, 'Arc length = 60/360 × 2π × 21 = 22 cm.', 92),
  makeQuestion('math-h-07', 'Mathematics', 'Hard', 'Circle Theorems', 'What is the area of a 60° sector of a circle with radius 6 cm?', ['3π cm²', '6π cm²', '12π cm²', '18π cm²'], 1, 'Sector area = 60/360 × π × 6² = 6π cm².'),
  makeQuestion('math-h-08', 'Mathematics', 'Hard', 'Trigonometry', 'Which identity is true for every angle θ for which the expressions are defined?', ['sin θ + cos θ = 1', 'tan θ = cos θ/sin θ', 'sin² θ + cos² θ = 1', 'sec θ = sin θ'], 2, 'The fundamental Pythagorean identity is sin² θ + cos² θ = 1.'),
  makeQuestion('math-h-09', 'Mathematics', 'Hard', 'Quadratic Equations', 'For which value of k does x² − 6x + k = 0 have equal roots?', ['6', '9', '12', '36'], 1, 'Equal roots require D = 0: (−6)² − 4k = 0, so k = 9.'),
  makeQuestion('math-h-10', 'Mathematics', 'Hard', 'Circle Theorems', 'Two tangents PA and PB are drawn from the same external point P to a circle. Which statement is always true?', ['PA > PB', 'PA < PB', 'PA = PB', 'PA + PB equals the radius'], 2, 'Tangents drawn from the same external point to a circle have equal lengths.'),

  // Science — Easy
  makeQuestion('science-e-01', 'Science', 'Easy', 'Life Processes', 'Salivary amylase begins the digestion of which food substance in the mouth?', ['Proteins', 'Fats', 'Starch', 'Vitamins'], 2, 'Salivary amylase breaks starch into simpler sugars.', 388),
  makeQuestion('science-e-02', 'Science', 'Easy', 'Chemistry', 'Which oxides form when aluminium and magnesium burn in air?', ['Al₂O₃ and MgO', 'AlO and Mg₂O', 'Al₂O and MgO₂', 'AlO₂ and Mg₂O'], 0, 'Aluminium forms aluminium oxide, Al₂O₃, while magnesium forms magnesium oxide, MgO.', 394),
  makeQuestion('science-e-03', 'Science', 'Easy', 'Reproduction', 'Which pair contains two bisexual flowers?', ['Papaya and mustard', 'Hibiscus and mustard', 'Hibiscus and papaya', 'Watermelon and papaya'], 1, 'Hibiscus and mustard flowers contain both stamens and pistils.', 403),
  makeQuestion('science-e-04', 'Science', 'Easy', 'Control & Coordination', 'Which part of the brain mainly maintains posture and balance?', ['Pons', 'Cerebrum', 'Cerebellum', 'Medulla'], 2, 'The cerebellum coordinates muscular activity and helps maintain posture and balance.', 405),
  makeQuestion('science-e-05', 'Science', 'Easy', 'Control & Coordination', 'Which part of the hindbrain controls involuntary actions such as vomiting and salivation?', ['Cerebellum', 'Cerebrum', 'Pons', 'Medulla'], 3, 'The medulla controls several involuntary actions, including vomiting and salivation.', 411),
  makeQuestion('science-e-06', 'Science', 'Easy', 'Nutrition', 'Which plant shows a parasitic mode of nutrition?', ['Bryophyllum', 'Hibiscus', 'Cuscuta', 'Sunflower'], 2, 'Cuscuta obtains food from a host plant using specialised structures.', 414),
  makeQuestion('science-e-07', 'Science', 'Easy', 'Plant Responses', 'The growth of a pollen tube towards an ovule is an example of what?', ['Phototropism', 'Hydrotropism', 'Geotropism', 'Chemotropism'], 3, 'Chemical signals guide the pollen tube, so the response is chemotropism.', 416),
  makeQuestion('science-e-08', 'Science', 'Easy', 'Environment', 'Which of these is an artificial ecosystem?', ['Pond', 'Forest', 'Grassland', 'Cropland'], 3, 'Cropland is created and maintained by people, unlike naturally occurring ponds, forests and grasslands.', 430),
  makeQuestion('science-e-09', 'Science', 'Easy', 'Heredity', 'What carries hereditary information from parents to offspring?', ['DNA', 'Starch', 'Bile', 'Chlorophyll'], 0, 'DNA stores genetic instructions that can pass from parents to offspring.'),
  makeQuestion('science-e-10', 'Science', 'Easy', 'Environment', 'Which material is biodegradable?', ['Glass bottle', 'Plastic bag', 'Vegetable peel', 'Aluminium can'], 2, 'Microorganisms can break vegetable peels down into simpler natural substances.'),

  // Science — Medium
  makeQuestion('science-m-01', 'Science', 'Medium', 'Chemistry', 'What is generally formed when hydrochloric acid reacts completely with sodium hydroxide?', ['Salt and water', 'Hydrogen and salt', 'Oxygen and water', 'Only water'], 0, 'The neutralisation reaction HCl + NaOH produces sodium chloride and water.', 385),
  makeQuestion('science-m-02', 'Science', 'Medium', 'Plant Responses', 'Which plant hormone promotes cell elongation on the shaded side of a shoot, causing it to bend towards light?', ['Cytokinin', 'Auxin', 'Adrenaline', 'Insulin'], 1, 'Auxin accumulates more on the shaded side, where it promotes elongation and bends the shoot toward light.', 393),
  makeQuestion('science-m-03', 'Science', 'Medium', 'Environment', 'Approximately what percentage of incident solar energy is captured by green plants as food energy in a terrestrial ecosystem?', ['1%', '10%', '50%', '99%'], 0, 'Green plants capture about 1% of the sunlight falling on their leaves as chemical energy.', 392),
  makeQuestion('science-m-04', 'Science', 'Medium', 'Chemistry', 'Tooth enamel begins to dissolve more rapidly when the mouth’s pH falls below approximately which value?', ['5.5', '7.0', '9.0', '12.0'], 0, 'Below about pH 5.5, acids can begin dissolving the mineral in tooth enamel.', 399),
  makeQuestion('science-m-05', 'Science', 'Medium', 'Chemistry', 'An ionic compound is most likely to conduct electricity when it is ______.', ['solid and dry', 'molten or dissolved in water', 'cooled below 0°C', 'mixed with sand'], 1, 'In a molten state or aqueous solution, ions are free to move and carry electric charge.'),
  makeQuestion('science-m-06', 'Science', 'Medium', 'Life Processes', 'Why are alveoli well suited for gas exchange?', ['They have thick dry walls', 'They have a large surface area and rich blood supply', 'They contain digestive enzymes', 'They pump blood directly'], 1, 'Many thin-walled alveoli provide a large moist surface close to capillaries, enabling rapid diffusion.'),
  makeQuestion('science-m-07', 'Science', 'Medium', 'Photosynthesis', 'Which set gives the main raw materials for photosynthesis?', ['Oxygen and glucose', 'Carbon dioxide and water', 'Nitrogen and minerals', 'Starch and oxygen'], 1, 'Plants use carbon dioxide and water, with light energy captured by chlorophyll, to make glucose.'),
  makeQuestion('science-m-08', 'Science', 'Medium', 'Environment', 'If producers store 10,000 J of energy, about how much is typically transferred to primary consumers?', ['100 J', '1,000 J', '5,000 J', '9,000 J'], 1, 'The 10% law estimates that about one-tenth of the energy passes to the next trophic level.'),
  makeQuestion('science-m-09', 'Science', 'Medium', 'Chemistry', 'Element A loses electrons and element B gains them. What type of bond is most likely formed between A and B?', ['Covalent bond', 'Ionic bond', 'Metallic bond', 'Hydrogen bond'], 1, 'Electron transfer produces oppositely charged ions that attract each other, forming an ionic bond.'),
  makeQuestion('science-m-10', 'Science', 'Medium', 'Heredity', 'A pure round-seeded pea plant (RR) is crossed with a wrinkled-seeded plant (rr). If round is dominant, what will the F₁ seeds be?', ['All round, genotype Rr', 'All wrinkled, genotype rr', 'Half round and half wrinkled', 'All round, genotype RR'], 0, 'Each offspring receives R from one parent and r from the other, so all are Rr and appear round.'),

  // Science — Hard
  makeQuestion('science-h-01', 'Science', 'Hard', 'Light & Optics', 'Presbyopia caused by reduced flexibility of the eye lens is commonly corrected using which lens arrangement?', ['Only a concave lens', 'A bifocal or progressive lens', 'Only a plane glass plate', 'A cylindrical mirror'], 1, 'Bifocal or progressive lenses provide different powers for near and distant viewing.', 384),
  makeQuestion('science-h-02', 'Science', 'Hard', 'Electricity', 'A wire is stretched to three times its original length without changing its volume. If its original resistance is R, what is its new resistance?', ['3R', '6R', '9R', '27R'], 2, 'Constant volume makes the area one-third as large. Since R = ρL/A, tripling L and dividing A by 3 makes resistance 9R.', 400),
  makeQuestion('science-h-03', 'Science', 'Hard', 'Light & Optics', 'Very fine particles scatter which visible colour most strongly?', ['Red', 'Orange', 'Blue', 'Yellow'], 2, 'For very small particles, shorter wavelengths are scattered more strongly; blue has a shorter wavelength than red.', 408),
  makeQuestion('science-h-04', 'Science', 'Hard', 'Light & Optics', 'A ray strikes a plane mirror at an angle of incidence of 15°. What is the angle between the incident ray and the reflected ray?', ['15°', '30°', '75°', '150°'], 1, 'The reflected ray also makes 15° with the normal, so the angle between the two rays is 15° + 15° = 30°.'),
  makeQuestion('science-h-05', 'Science', 'Hard', 'Light & Optics', 'A convex mirror always forms an image that is ______.', ['real, inverted and magnified', 'virtual, erect and diminished', 'virtual, inverted and diminished', 'real, erect and diminished'], 1, 'For every object position, a convex mirror forms a virtual, erect and diminished image behind the mirror.', 421),
  makeQuestion('science-h-06', 'Science', 'Hard', 'Electricity', 'Two resistors of 1 Ω and 3 Ω are connected in parallel to a source. If the total current is 1 A, what current flows through the 3 Ω resistor?', ['0.25 A', '0.33 A', '0.50 A', '0.75 A'], 0, 'The equivalent resistance is 0.75 Ω, so the voltage is 0.75 V. Current through 3 Ω is 0.75/3 = 0.25 A.', 423),
  makeQuestion('science-h-07', 'Science', 'Hard', 'Light & Optics', 'What happens when the upper half of a convex lens is covered with opaque paper?', ['Only half the image forms', 'The full image forms but is dimmer', 'The image becomes twice as large', 'No image forms'], 1, 'Every part of the lens contributes rays from the whole object. Blocking half reduces light but does not remove half the image.', 424),
  makeQuestion('science-h-08', 'Science', 'Hard', 'Magnetism', 'Which current-carrying device produces a magnetic field most similar to that of a bar magnet?', ['Straight wire', 'Single circular loop', 'Solenoid', 'Fuse wire'], 2, 'A solenoid has north and south magnetic poles and a field pattern like a bar magnet.', 428),
  makeQuestion('science-h-09', 'Science', 'Hard', 'Genetics', 'In humans, which parent’s gamete determines whether a child has XX or XY chromosomes?', ['Mother only', 'Father only', 'Both always contribute Y', 'Neither parent'], 1, 'The egg always contributes X, while the sperm contributes either X or Y; therefore the father’s gamete determines XX or XY.', 435),
  makeQuestion('science-h-10', 'Science', 'Hard', 'Electricity', 'A 12 V battery is connected across a 6 Ω resistor. How much heat is produced in 5 seconds?', ['24 J', '60 J', '120 J', '240 J'], 2, 'Power = V²/R = 144/6 = 24 W. Heat in 5 s is Pt = 24 × 5 = 120 J.'),

  // Computer — Easy
  makeQuestion('computer-e-01', 'Computer', 'Easy', 'Artificial Intelligence', 'Which technology enables computers to perform tasks that normally require human-like intelligence?', ['Cloud storage', 'Artificial intelligence', 'Word processing', 'Data entry'], 1, 'Artificial intelligence enables systems to perform tasks such as recognising patterns, making predictions and understanding language.', 5),
  makeQuestion('computer-e-02', 'Computer', 'Easy', 'Files & Media', 'Which file extension is commonly used for a photograph?', ['.txt', '.exe', '.jpg', '.mp3'], 2, 'JPEG photographs commonly use the .jpg or .jpeg extension.', 14),
  makeQuestion('computer-e-03', 'Computer', 'Easy', 'Internet', 'What is a web browser used for?', ['Creating electricity', 'Opening and viewing websites', 'Printing money', 'Repairing hardware'], 1, 'A browser requests, displays and lets you interact with content from websites.'),
  makeQuestion('computer-e-04', 'Computer', 'Easy', 'Digital Citizenship', 'Copying someone else’s work and claiming it as your own is called what?', ['Phishing', 'Plagiarism', 'Spamming', 'Encryption'], 1, 'Plagiarism means presenting another person’s words, ideas or work as your own.', 55),
  makeQuestion('computer-e-05', 'Computer', 'Easy', 'Internet', 'Which symbol must appear in a standard email address?', ['#', '@', '&', '%'], 1, 'The @ symbol separates the user or mailbox name from the domain name.'),
  makeQuestion('computer-e-06', 'Computer', 'Easy', 'Hardware', 'Which device is mainly used to enter text into a computer?', ['Monitor', 'Speaker', 'Keyboard', 'Projector'], 2, 'A keyboard is an input device used to enter letters, numbers and commands.'),
  makeQuestion('computer-e-07', 'Computer', 'Easy', 'Data', 'How many bits make one byte?', ['2', '4', '8', '16'], 2, 'A byte is conventionally made of 8 bits.'),
  makeQuestion('computer-e-08', 'Computer', 'Easy', 'Cyber Safety', 'Which password is strongest?', ['password', '12345678', 'Riya2000', 'M7!qP2#zL9'], 3, 'A longer password with an unpredictable mix of characters is harder to guess or crack.'),
  makeQuestion('computer-e-09', 'Computer', 'Easy', 'Artificial Intelligence', 'Recommendation systems used by streaming and shopping platforms are an application of what?', ['Artificial intelligence', 'Only electricity', 'Word processing', 'Computer printing'], 0, 'Recommendation systems use data and algorithms to predict items a user may prefer.', 19),
  makeQuestion('computer-e-10', 'Computer', 'Easy', 'Web Basics', 'What does URL identify?', ['A location of a resource on the web', 'The speed of a keyboard', 'A type of computer virus', 'The size of a monitor'], 0, 'A URL is the address used to locate a resource such as a webpage on the internet.'),

  // Computer — Medium
  makeQuestion('computer-m-01', 'Computer', 'Medium', 'Artificial Intelligence', 'In a typical AI project cycle, which stage follows problem scoping?', ['Evaluation', 'Data acquisition', 'Deployment', 'Retirement'], 1, 'After defining the problem, relevant data is acquired before it can be explored and used to build a model.', 6),
  makeQuestion('computer-m-02', 'Computer', 'Medium', 'Data Science', 'Which measure gives the percentage of all predictions that were correct?', ['Precision', 'Accuracy', 'Recall', 'F1 score'], 1, 'Accuracy equals the number of correct predictions divided by the total number of predictions.', 2),
  makeQuestion('computer-m-03', 'Computer', 'Medium', 'Databases', 'Which tool is designed to store and query structured tables of related data?', ['Relational database', 'Image editor', 'Media player', 'Presentation slide'], 0, 'A relational database organises structured data in tables and supports queries using systems such as SQL.', 8),
  makeQuestion('computer-m-04', 'Computer', 'Medium', 'Natural Language Processing', 'In text processing, common words such as “the”, “is” and “an” are often called what?', ['Stop words', 'Passwords', 'File paths', 'Pixels'], 0, 'Frequently occurring function words that may add little value to some analyses are called stop words.', 17),
  makeQuestion('computer-m-05', 'Computer', 'Medium', 'Natural Language Processing', 'Which NLP application creates a shorter version that preserves the main ideas of a document?', ['Sentiment analysis', 'Automatic summarisation', 'Speech volume control', 'Image segmentation'], 1, 'Automatic summarisation identifies and presents the most important information in a shorter form.', 22),
  makeQuestion('computer-m-06', 'Computer', 'Medium', 'Algorithms', 'What must an algorithm have to be useful for solving a problem?', ['Only pictures', 'Clear, finite and ordered steps', 'A very long file name', 'An internet connection'], 1, 'An algorithm is a finite sequence of unambiguous steps that leads toward a result.'),
  makeQuestion('computer-m-07', 'Computer', 'Medium', 'Number Systems', 'What is the decimal value of the binary number 1010?', ['8', '9', '10', '12'], 2, '1010₂ = 1×8 + 0×4 + 1×2 + 0×1 = 10.'),
  makeQuestion('computer-m-08', 'Computer', 'Medium', 'Networks', 'Which protocol is used to securely load most modern websites?', ['HTTP only', 'HTTPS', 'FTP', 'SMTP'], 1, 'HTTPS uses encryption and authentication to protect web traffic between the browser and server.'),
  makeQuestion('computer-m-09', 'Computer', 'Medium', 'Web & HTML', 'Which HTML element represents the most important page heading?', ['<p>', '<h1>', '<img>', '<br>'], 1, 'The <h1> element represents the highest-level heading in a page or section.'),
  makeQuestion('computer-m-10', 'Computer', 'Medium', 'Spreadsheets', 'Which spreadsheet formula correctly adds values from cells A1 through A5?', ['=ADD(A1-A5)', '=SUM(A1:A5)', '=TOTAL(A1,A5)', '=A1:A5+'], 1, 'SUM adds every numeric value in the specified range A1:A5.'),

  // Computer — Hard
  makeQuestion('computer-h-01', 'Computer', 'Hard', 'Number Systems', 'What is the binary representation of decimal 25?', ['10101', '11001', '11010', '11100'], 1, '25 = 16 + 8 + 1, so the binary place values are 1, 1, 0, 0, 1: 11001₂.'),
  makeQuestion('computer-h-02', 'Computer', 'Hard', 'Boolean Logic', 'If A is true and B is false, what is the value of (A AND B) OR (NOT B)?', ['True', 'False', 'Undefined', 'Equal to A AND B'], 0, 'A AND B is false, while NOT B is true. False OR true evaluates to true.'),
  makeQuestion('computer-h-03', 'Computer', 'Hard', 'Algorithms', 'A binary search is used on a sorted list of 64 items. What is the worst-case maximum number of item comparisons needed to find a present item?', ['6', '7', '32', '64'], 1, 'Binary search repeatedly halves the search space. A 64-item list can require one final comparison after six halvings, for at most 7 comparisons.'),
  makeQuestion('computer-h-04', 'Computer', 'Hard', 'Networks', 'Which statement best describes the role of TCP?', ['It assigns colours to webpages', 'It provides reliable, ordered delivery of data', 'It converts images into electricity', 'It stores passwords in plain text'], 1, 'TCP numbers, checks and retransmits segments so applications receive data reliably and in order.'),
  makeQuestion('computer-h-05', 'Computer', 'Hard', 'Databases', 'What is the main purpose of a primary key in a database table?', ['To colour every row', 'To uniquely identify each record', 'To duplicate records', 'To hide all columns'], 1, 'A primary key has a unique value for each record, allowing that record to be identified reliably.'),
  makeQuestion('computer-h-06', 'Computer', 'Hard', 'Artificial Intelligence', 'A model scores 99% on training data but only 62% on new data. What is the most likely problem?', ['Encryption', 'Overfitting', 'Compression', 'Packet switching'], 1, 'Overfitting occurs when a model learns training details too closely and fails to generalise to unseen data.'),
  makeQuestion('computer-h-07', 'Computer', 'Hard', 'Cybersecurity', 'Why is hashing preferred over reversible encryption for storing passwords?', ['A hash is intended to be one-way', 'A hash makes passwords shorter for display', 'Hashing sends passwords by email', 'Hashing removes the need for access control'], 0, 'A secure password hash is designed to be one-way, so the original password should not be recoverable from the stored value.'),
  makeQuestion('computer-h-08', 'Computer', 'Hard', 'Cybersecurity', 'A message claims your account will close immediately unless you open a link and enter your password. What is the safest response?', ['Open the link quickly', 'Reply with the password', 'Use the organisation’s official site or app to verify the claim', 'Forward it to every contact'], 2, 'Urgent credential requests are a common phishing tactic. Verify through an independently trusted official channel.'),
  makeQuestion('computer-h-09', 'Computer', 'Hard', 'Databases', 'Which SQL query returns every row from a table named Students where score is greater than 80?', ['SELECT * FROM Students WHERE score > 80;', 'GET Students IF score = 80;', 'SELECT score > 80 FROM ALL;', 'SHOW Students ABOVE 80;'], 0, 'SELECT chooses columns, FROM names the table and WHERE filters rows by the stated condition.'),
  makeQuestion('computer-h-10', 'Computer', 'Hard', 'Artificial Intelligence', 'In a medical screening model, which metric focuses on how many truly positive cases were successfully found?', ['Recall', 'File size', 'Screen resolution', 'Compression ratio'], 0, 'Recall is true positives divided by all actual positives, so it measures how many real positive cases were detected.'),
];
