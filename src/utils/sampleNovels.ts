import { DocumentItem } from '../types';
import { parseNovelText } from './textParser';

const SHERLOCK_TEXT = `CHAPTER I. A MYSTERIOUS VISITATION

On glancing over my notes of the seventy odd cases in which I have during the last eight years studied the methods of my friend Sherlock Holmes, I find many tragic, some comic, a large number merely strange, but none which were commonplace.
For, working as he did rather for the love of his art than for the acquirement of wealth, he refused to associate himself with any investigation which did not tend towards the unusual, and even the fantastic.
Of all these varied cases, however, I cannot recall any which presented more singular features than that which was associated with the well-known Surrey family of the Roylotts of Stoke Moran.
The events in question occurred in the early days of my association with Holmes, when we were sharing rooms as bachelors in Baker Street.

It was early in April in the year '83 that I woke one morning to find Sherlock Holmes standing, fully dressed, by the side of my bed.
He was a late riser, as a rule, and as the clock on the mantelpiece showed me that it was only a quarter-past seven, I blinked up at him in some surprise, and perhaps with a little resentment, for I was myself regular in my habits.
"Very sorry to knock you up, Watson," said he, "but it's the common lot this morning. Mrs. Hudson has been knocked up, she retorted upon me, and I on you."
"What is it, then—a fire?"
"No; a client. It seems that a young lady has arrived in a considerable state of excitement, who insists upon seeing me. She is waiting now in the sitting-room. Now, when young ladies wander about the metropolis at this hour of the morning, and knock sleepy people up out of their beds, I presume that it is something very pressing which they have to communicate."

CHAPTER II. THE TRAGEDY OF STOKE MORAN

Holmes drew up the blinds, and let in the crisp April sunshine.
"I believe that you are cold," said Holmes, leaning forward and patting her hand. "Pray draw nearer to the fire."
"It is not cold which makes me shiver," said the woman in a low voice, shifting her seat as requested.
"What, then?"
"It is fear, Mr. Holmes. It is terror."
She raised her veil as she spoke, and we could see that she was indeed in a pitiable state of agitation, her face all drawn and grey, with restless, frightened eyes, like those of some hunted animal.
Her features and figure were those of a woman of thirty, but her hair was shot with premature grey, and her expression was weary and haggard.
Sherlock Holmes ran her over with one of his quick, all-comprehensive glances.
"You must not fear," said he soothingly, bending forward and patting her forearm. "We shall soon set matters right, I have no doubt. You have come in by train this morning, I see."
"You know me, then?"
"No, but I observe the second half of a return ticket in the palm of your left glove. You must have started early, and yet you had a good drive in a dog-cart, along heavy roads, before you reached the station."
The lady gave a violent start and stared in bewilderment at my companion.`;

const VIETNAMESE_TALE = `CHƯƠNG 1. SỰ TÍCH QUẢ DƯA HẤU - MAI AN TIÊM

Vào đời Vua Hùng Vương thứ mười bảy, có một chàng trai tên là Mai An Tiêm.
Mai An Tiêm vốn là một đứa trẻ mồ côi, có tướng mạo khôi ngô tuấn tú và trí thông minh hơn người.
Nhà vua yêu mến tài đức của chàng nên nhận làm con nuôi, phong tước hầu và gả cho một nàng công chúa hiền thục.
An Tiêm làm việc chăm chỉ, lo liệu việc triều đình chu đáo, trong cung ai nấy đều kính trọng.

Tuy sống trong cảnh nhung lụa giàu sang, An Tiêm không hề ỷ lại.
Chàng thường bảo với mọi người: "Của cải bạc tiền đều là do bàn tay lao động của con người làm ra, của biếu là của lo, của cho là của nợ."
Lời nói ấy vô tình lọt vào tai một số quan lại ghen ghét đố kỵ.
Họ liền tâu lại với Hùng Vương, thêu dệt rằng Mai An Tiêm là kẻ kiêu ngạo, coi thường ơn mưa móc của nhà vua.
Vua Hùng nổi giận lôi đình, phán truyền đày gia đình Mai An Tiêm ra một hòn đảo hoang ngoài biển khơi xa xôi.

CHƯƠNG 2. HẠT NGỌC GIỮA ĐẢO HOANG

Đảo hoang bốn bề sóng vỗ bọt trắng xóa, chỉ có cát trắng, lau sậy và tiếng hải âu kêu chiều.
Người vợ buồn rầu than khóc, nhưng Mai An Tiêm bình tĩnh ôm vợ con vào lòng và bảo:
"Trời sinh voi tất sinh cỏ, ta có đôi bàn tay này thì ở đâu cũng có thể sống được."
Hai vợ chồng dựng một căn lều lá dừa, đào giếng tìm nước ngọt, ngày ngày bắt cá, hái rau rừng đắp đổi qua ngày.

Một ngày nọ, An Tiêm nhìn thấy một đàn chim hải âu từ phương nam bay tới đậu trên mỏm đá.
Chúng tranh nhau ăn một thứ quả dại màu xanh thẫm, vừa ăn vừa kêu ríu rít.
Khi đàn chim bay đi, chúng để lại những hạt đen bóng trên bãi cát.
An Tiêm nhặt lấy vài hạt, ngẫm nghĩ: "Chim ăn được thì người cũng ắt ăn được."
Chàng xới đất cát màu mỡ ven bờ, gieo những hạt mầm ấy xuống và cẩn thận tưới nước mỗi ngày.
Chẳng bao lâu sau, dây leo bò lan khắp bãi cát, ra những bông hoa vàng tươi rồi kết thành những quả dưa to tròn mọng nước.
Khi bổ ra, ruột quả đỏ tươi, hạt đen nhánh, ăn vào có vị ngọt thanh mát lịm lòng người.
An Tiêm khắc tên mình lên vỏ quả rồi thả xuống biển để sóng đưa vào đất liền, mở ra con đường đưa giống dưa quý đến muôn dân.`;

const ALICE_TEXT = `CHAPTER I. DOWN THE RABBIT-HOLE

Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do.
Once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it.
"And what is the use of a book," thought Alice, "without pictures or conversations?"
So she was considering in her own mind whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies.
Suddenly a White Rabbit with pink eyes ran close by her!

There was nothing so very remarkable in that; nor did Alice think it so very much out of the way to hear the Rabbit say to itself, "Oh dear! Oh dear! I shall be late!"
When she thought it over afterwards, it occurred to her that she ought to have wondered at this, but at the time it all seemed quite natural.
When the Rabbit actually took a watch out of its waistcoat-pocket, and looked at it, and then hurried on, Alice started to her feet.
She flashed across her mind that she had never before seen a rabbit with either a waistcoat-pocket, or a watch to take out of it.
Burning with curiosity, she ran across the field after it, and fortunately was just in time to see it pop down a large rabbit-hole under the hedge.

In another moment down went Alice after it, never once considering how in the world she was to get out again.
The rabbit-hole went straight on like a tunnel for some way, and then dipped suddenly down, so suddenly that Alice had not a moment to think about stopping herself before she found herself falling down a very deep well.`;

const SCIFI_TEXT = `CHAPTER I. THE SIGNAL FROM EPSILON

The quantum observatory aboard the orbital station Aethelgard hummed with the rhythmic pulse of its fusion core.
Dr. Elena Vane adjusted the holographic spectrum analyzer as a sudden resonance spike cascaded across the gravitational wave monitors.
"Computer, cross-reference celestial coordinates 14-Omega with the deep space pulsar catalog," Elena commanded quietly.
"Processing query," the melodic synthetic voice replied. "No matching astronomical phenomena found. Signal exhibits structured harmonic modulation."
Elena felt a chill race along her spine.
For four hundred years, humanity had searched the silence between the stars.
Every radio telescope, laser array, and subspace neutrino detector had returned only the cold, indifferent static of the void.
Until tonight.

CHAPTER II. DECIPHERING THE CHORUS

The waveform was not a binary sequence, nor was it prime numbers.
It was something far more intricate: a multi-layered acoustic lattice weaving twenty distinct polyphonic frequencies simultaneously.
Elena placed her fingers against the glass panel overlooking the glowing crescent of Mars below.
"Elena, look at this," interrupted Marcus, her lead astrophysicist, his eyes wide behind augmented reality lenses.
"The signal isn't originating from a star system. It's moving towards the solar boundary at forty percent the speed of light."
"Estimated arrival time?" Elena asked, her voice steady despite the rapid pounding in her chest.
"Seventy-two hours," Marcus whispered. "And whoever they are, they are singing directly to us."`;

function createDocument(
  id: string,
  title: string,
  author: string,
  rawText: string,
  format: 'sample' = 'sample'
): DocumentItem {
  const chapters = parseNovelText(rawText, title);
  const totalWords = chapters.reduce((acc, c) => acc + c.wordCount, 0);
  const totalSentences = chapters.reduce((acc, c) => acc + c.totalSentences, 0);

  return {
    id,
    title,
    author,
    format,
    chapters,
    createdAt: Date.now(),
    lastRead: {
      chapterIndex: 0,
      sentenceIndex: 0,
      progressPercentage: 0,
      updatedAt: Date.now(),
    },
    totalWords,
    totalSentences,
  };
}

export const SAMPLE_DOCUMENTS: DocumentItem[] = [
  createDocument(
    'sample-sherlock',
    'The Adventure of the Speckled Band',
    'Sir Arthur Conan Doyle',
    SHERLOCK_TEXT
  ),
  createDocument(
    'sample-vietnamese',
    'Sự Tích Quả Dưa Hấu (Mai An Tiêm)',
    'Truyện Cổ Tích Dân Gian Việt Nam',
    VIETNAMESE_TALE
  ),
  createDocument('sample-alice', "Alice's Adventures in Wonderland", 'Lewis Carroll', ALICE_TEXT),
  createDocument(
    'sample-scifi',
    'The Signal from Epsilon: First Contact',
    'Sci-Fi Archive',
    SCIFI_TEXT
  ),
];
