export type HeroSlide = {
  bgImage: string;
  hashtag: string;
  title: string;
  text: string;
  mobileTitle?: string;
  mobileText?: string;
};

// Данные перенесены из YouBaBa/Js/hero-slider.js
export const heroSlides: HeroSlide[] = [
  {
    bgImage: '/Images/27daf6067b7793727c9185f9b8fbf01a_1765394980.png',
    hashtag: 'Супер!',
    title: 'Бессмертная классика',
    text: 'Том Ям. Филадельфия с лососем',
    mobileTitle: 'Бессмертная классика',
    mobileText: 'Том Ям. Филадельфия с лососем'
  },
  {
    bgImage: '/Images/d7ca9d44-aa21-4df2-a6b5-f4079c7a7013.jpg',
    hashtag: 'Качество!',
    title: 'Качество',
    text: 'Используем только свежую, охлажденную рыбу',
    mobileTitle: 'Качество',
    mobileText: 'Используем только свежую, охлажденную рыбу'
  },
  {
    bgImage: '/Images/d3a5d950-62c7-4eae-ad21-fc50cc3f5736.jpg',
    hashtag: 'Много!',
    title: 'Большие порции',
    text: '',
    mobileTitle: 'Большие порции',
    mobileText: ''
  },
  {
    bgImage: '/Images/f1c3434c187eaefafd20c2fd09928b38_1765384588.png',
    hashtag: 'Минимум!',
    title: 'Минимальный заказ от 1700р',
    text: '',
    mobileTitle: 'Минимальный заказ от 1700р',
    mobileText: ''
  },
  {
    bgImage: '/Images/1765401963504-t0k710cecnd.png',
    hashtag: 'Подарок!',
    title: 'Ролл в подарок!',
    text: 'При заказе от 2500р, ролл запеченый с лососем в подарок!',
    mobileTitle: 'Ролл в подарок!',
    mobileText: 'При заказе от 2500р, ролл запеченый с лососем в подарок!'
  },
  {
    bgImage: '/Images/ebc994a0-505d-45ee-8c3d-d41aa0132661.jpg',
    hashtag: 'Снеки!',
    title: 'Азиатские снеки',
    text: 'В магазине предоставлен ассортимент азиантских снеков! Филимоновская 18',
    mobileTitle: 'Азиатские снеки',
    mobileText: 'В магазине предоставлен ассортимент азиантских снеков! Филимоновская 18'
  },
  {
    bgImage: '/Images/bg-hero.jpg',
    hashtag: 'Магия!',
    title: 'Попробуй магию на вкус!',
    text: '',
    mobileTitle: 'Попробуй магию на вкус!',
    mobileText: ''
  }
];
