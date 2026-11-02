export interface Step {
  index: string;
  title: string;
  copy: string;
}

export const STEPS: Step[] = [
  {
    index: '01',
    title: 'The Cone',
    copy: 'Every scoop starts with a waffle cone, pressed each morning and still warm at the edges.',
  },
  {
    index: '02',
    title: 'The Scoop',
    copy: 'Slow-churned gelato, scooped by hand and set down gently so it melts only when you want it to.',
  },
  {
    index: '03',
    title: 'The Dip',
    copy: 'A curtain of single-origin chocolate, poured warm and setting into a glossy, snapping shell.',
  },
  {
    index: '04',
    title: 'The Crunch',
    copy: 'Finished with toasted pistachio nibs for crunch in every bite. Ready when you are.',
  },
];

export const NAV_LINKS = [
  { label: 'Home', target: '#top' },
  { label: 'Flavors', target: '#flavors' },
  { label: 'Craft', target: '#craft' },
  { label: 'Story', target: '#story' },
  { label: 'Visit', target: '#visit' },
];

export const CRAFT = [
  {
    index: '01',
    title: 'Churn',
    copy: 'Milk from one farm, fruit from people we know by name. Everything is churned slowly in copper, in batches small enough to taste each one.',
    stat: '9',
    unit: 'litres per batch',
  },
  {
    index: '02',
    title: 'Rest',
    copy: 'Our bases mature overnight so flavours settle and the texture turns silky. No stabilisers, no shortcuts, just time.',
    stat: '18',
    unit: 'hours of rest',
  },
  {
    index: '03',
    title: 'Serve',
    copy: 'Kept at the exact temperature where gelato is softest and most aromatic, then served in a cone baked that morning.',
    stat: '-12',
    unit: '°C serving point',
  },
];

export const STORY =
  'GELORA began with one copper pan, a borrowed churn and a stubborn idea: gelato should taste exactly like the thing it is made of. Pistachio that tastes of pistachio. Strawberries picked the week they are churned. Nothing hidden, nothing rushed, and every cone finished by hand in front of you.';
