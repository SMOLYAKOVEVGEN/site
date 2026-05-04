export type CertificateItem = {
  id: string;
  category: 'certificate' | 'award';
  title: string;
  description: string;
  image: string;
  issueDate?: string;
  expiryDate?: string;
  location?: string;
};

export const certificatesData: CertificateItem[] = [
  {
    id: 'certificate-iso-9001-autograph',
    category: 'certificate',
    title: 'Сертификат соответствия № СДС.ФР.СМ.00979.25',
    description:
      'Сертификат удостоверяет, что система менеджмента качества ООО «АВТОграф Инструментальные Решения» соответствует требованиям ГОСТ Р ИСО 9001-2015 (ISO 9001:2015) в области ремонта машин и оборудования, механической обработки изделий, торговли металлообрабатывающими станками, металлорежущим инструментом и смазочно-охлаждающими жидкостями.',
    image:
      'https://btppiivskcahxrswlwzs.supabase.co/storage/v1/object/public/catalog-media/certificates/certificate-iso-9001-autograph.jpg',
    issueDate: '30.09.2025',
  },
  {
    id: 'certificate-fedregister-mark',
    category: 'certificate',
    title: 'Разрешение на применение знака соответствия системы добровольной сертификации «ФедРегистр»',
    description:
      'На основании сертификата № СДС.ФР.СМ.00837.22 компания ООО «АВТОграф Инструментальные Решения» вправе использовать знак соответствия в технической, сопроводительной, финансовой документации, рекламных продуктах, брошюрах и плакатах.',
    image:
      'https://btppiivskcahxrswlwzs.supabase.co/storage/v1/object/public/catalog-media/certificates/certificate-fedregister-mark.jpg',
    issueDate: '02.02.2022',
    expiryDate: '02.02.2025',
  },
  {
    id: 'certificate-hazet-metrology',
    category: 'certificate',
    title: 'Сертификат об утверждении типа измерений',
    description:
      'Свидетельство об утверждении типа средств измерений для всех моделей механических динамометрических ключей HAZET, включая серию System 5000-3CT, выданное Росстандартом.',
    image:
      'https://btppiivskcahxrswlwzs.supabase.co/storage/v1/object/public/catalog-media/certificates/certificate-hazet-metrology.jpg',
    issueDate: '02.12.2019',
    expiryDate: '28.11.2024',
  },
  {
    id: 'certificate-projahn-dealer',
    category: 'certificate',
    title: 'Сертификат официального дилера Projahn',
    description:
      'ООО «АВТОграф Инструментальные Решения» является авторизованным и эксклюзивным дистрибьютором продукции торговой марки Projahn на территории Российской Федерации.',
    image:
      'https://btppiivskcahxrswlwzs.supabase.co/storage/v1/object/public/catalog-media/certificates/certificate-projahn-dealer.jpg',
    expiryDate: '31.12.2023',
  },
  {
    id: 'certificate-vhm-schwarz-dealer',
    category: 'certificate',
    title: 'Сертификат официального дилера VHM Schwarz Präzisionswerkzeuge GmbH',
    description:
      'ООО «АВТОграф Инструментальные Решения» является официальным дилером продукции VHM Schwarz Präzisionswerkzeuge GmbH на территории Российской Федерации.',
    image:
      'https://btppiivskcahxrswlwzs.supabase.co/storage/v1/object/public/catalog-media/certificates/certificate-vhm-schwarz-dealer.jpg',
    issueDate: '10.02.2023',
    expiryDate: '31.12.2023',
  },
  {
    id: 'certificate-hpmt-iso-9001',
    category: 'certificate',
    title: 'Сертификат соответствия инструмента HPMT стандарту ISO 9001:2015',
    description:
      'Сертификат подтверждает, что режущий инструмент для металлообработки HPMT, как стандартный, так и изготовленный на заказ, соответствует требованиям стандарта ISO 9001:2015.',
    image:
      'https://btppiivskcahxrswlwzs.supabase.co/storage/v1/object/public/catalog-media/certificates/certificate-hpmt-iso-9001.jpg',
    issueDate: '13.12.2021',
    expiryDate: '14.08.2024',
  },
  {
    id: 'certificate-optimus-wiederkraft',
    category: 'certificate',
    title: 'Сертификат официального представителя Optimus',
    description:
      'ООО «АВТОграф Инструментальные Решения» является официальным представителем торговой марки WiederKraft на территории Российской Федерации и уполномочено осуществлять продажу наборов метчиков и плашек торговой марки Optimus.',
    image:
      'https://btppiivskcahxrswlwzs.supabase.co/storage/v1/object/public/catalog-media/certificates/certificate-optimus-wiederkraft.jpg',
    issueDate: '01.2023',
    expiryDate: '31.12.2023',
  },

  {
    id: 'diploma-metalworking-2025',
    category: 'award',
    title: 'Диплом XXV выставки «Металлообработка-2025»',
    description:
      'Диплом за участие в 25-й юбилейной международной специализированной выставке «Металлообработка-2025».',
    image:
      'https://btppiivskcahxrswlwzs.supabase.co/storage/v1/object/public/catalog-media/certificates/diploma-metalworking-2025.jpg',
    location: 'Москва, ЦВК «Экспоцентр»',
    issueDate: '26–29.05.2025',
  },
  {
    id: 'diploma-ural-metalworking-2025',
    category: 'award',
    title: 'Диплом выставки «Металлообработка. Сварка - Урал. 2025»',
    description:
      'Диплом за активное участие в выставке «Металлообработка. Сварка - Урал. 2025» и демонстрацию передовых технологий в области металлообработки.',
    image:
      'https://btppiivskcahxrswlwzs.supabase.co/storage/v1/object/public/catalog-media/certificates/diploma-ural-metalworking-2025.jpg',
    location: 'Екатеринбург, PRO-EXPO',
    issueDate: '18–21.03.2025',
  },
  {
    id: 'diploma-technoforum-2024',
    category: 'award',
    title: 'Диплом выставки «Технофорум-2024»',
    description:
      'Диплом за участие в международной политехнической выставке «Оборудование и технологии обработки конструкционных материалов «Технофорум-2024».',
    image:
      'https://btppiivskcahxrswlwzs.supabase.co/storage/v1/object/public/catalog-media/certificates/diploma-technoforum-2024.jpg',
    location: 'Москва, ЦВК «Экспоцентр»',
    issueDate: '21–24.10.2024',
  },
  {
    id: 'diploma-metalworking-2023',
    category: 'award',
    title: 'Диплом XXIII выставки «Металлообработка-2023»',
    description:
      'Диплом за участие в 23-й международной специализированной выставке «Металлообработка-2023».',
    image:
      'https://btppiivskcahxrswlwzs.supabase.co/storage/v1/object/public/catalog-media/certificates/diploma-metalworking-2023.jpg',
    location: 'Москва, ЦВК «Экспоцентр»',
    issueDate: '22–26.05.2023',
  },
  {
    id: 'diploma-spb-tech-fair',
    category: 'award',
    title: 'Диплом «Петербургской Технической Ярмарки»',
    description:
      'Диплом за активное участие в «Петербургской Технической Ярмарке» и вклад в развитие научно-промышленной сферы.',
    image:
      'https://btppiivskcahxrswlwzs.supabase.co/storage/v1/object/public/catalog-media/certificates/diploma-spb-tech-fair.jpg',
    location: 'Санкт-Петербург',
    issueDate: '18–20.04.2023',
  },
  {
    id: 'diploma-ural-metalworking-2023',
    category: 'award',
    title: 'Диплом выставки «Металлообработка. Сварка - Урал. 2023»',
    description:
      'Диплом за представление инструмента и станочной оснастки, позволяющих повысить эффективность производственных процессов.',
    image:
      'https://btppiivskcahxrswlwzs.supabase.co/storage/v1/object/public/catalog-media/certificates/diploma-ural-metalworking-2023.jpg',
    location: 'Екатеринбург, PRO-EXPO',
    issueDate: '14–17.03.2023',
  },
  {
    id: 'diploma-mosbuild',
    category: 'award',
    title: 'Диплом выставки строительных материалов MosBuild',
    description:
      'Диплом участника 28-й Международной выставки строительных и отделочных материалов MosBuild.',
    image:
      'https://btppiivskcahxrswlwzs.supabase.co/storage/v1/object/public/catalog-media/certificates/diploma-mosbuild.jpg',
  },
  {
    id: 'diploma-metalworking-2022',
    category: 'award',
    title: 'Диплом XXII выставки «Металлообработка-2022»',
    description:
      'Диплом за участие в 22-й международной специализированной выставке «Металлообработка-2022».',
    image:
      'https://btppiivskcahxrswlwzs.supabase.co/storage/v1/object/public/catalog-media/certificates/diploma-metalworking-2022.jpg',
    location: 'Москва, ЦВК «Экспоцентр»',
    issueDate: '23–27.05.2022',
  },
  {
    id: 'diploma-ufa-2022',
    category: 'award',
    title: 'Диплом выставки «Машиностроение. Металлообработка. Уфа-2022»',
    description:
      'Диплом за профессионализм, актуальность представленной экспозиции и плодотворное сотрудничество.',
    image:
      'https://btppiivskcahxrswlwzs.supabase.co/storage/v1/object/public/catalog-media/certificates/diploma-ufa-2022.jpg',
    location: 'Уфа, ВК-ВДНХ-ЭКСПО',
    issueDate: '16–18.11.2022',
  },
  {
    id: 'gratitude-att',
    category: 'award',
    title: 'Благодарность «Академии Транспортных Технологий»',
    description:
      'Благодарность генеральному директору ООО «АИР» за оперативность, профессионализм и высокое качество услуг по восстановлению работоспособности оборудования в учебных мастерских.',
    image:
      'https://btppiivskcahxrswlwzs.supabase.co/storage/v1/object/public/catalog-media/certificates/gratitude-att.jpg',
  },
  {
    id: 'gratitude-mbk-karkas',
    category: 'award',
    title: 'Благодарность «МБК-Каркас»',
    description:
      'Благодарность за оперативность, профессионализм и высокое качество услуг в сфере поставок металлорежущего инструмента, станочной оснастки и СОЖ.',
    image:
      'https://btppiivskcahxrswlwzs.supabase.co/storage/v1/object/public/catalog-media/certificates/gratitude-mbk-karkas.jpg',
  },
  {
    id: 'diploma-technoforum-2022',
    category: 'award',
    title: 'Диплом политехнической выставки «Технофорум-2022»',
    description:
      'Диплом за участие в международной политехнической выставке «Оборудование и технологии обработки конструкционных материалов «Технофорум-2022».',
    image:
      'https://btppiivskcahxrswlwzs.supabase.co/storage/v1/object/public/catalog-media/certificates/diploma-technoforum-2022.jpg',
    location: 'Москва, ЦВК «Экспоцентр»',
    issueDate: '24–27.10.2022',
  },
  {
    id: 'gratitude-spb-college',
    category: 'award',
    title: 'Благодарность Санкт-Петербургского Технического колледжа',
    description:
      'Благодарность за плодотворное сотрудничество, квалифицированную техническую поддержку и оперативные поставки высококачественной смазочно-охлаждающей жидкости.',
    image:
      'https://btppiivskcahxrswlwzs.supabase.co/storage/v1/object/public/catalog-media/certificates/gratitude-spb-college.jpg',
  },
  {
    id: 'gratitude-mashinostroitel',
    category: 'award',
    title: 'Благодарственное письмо завода «Машиностроитель»',
    description:
      'Благодарственное письмо за поставку металлорежущего инструмента, полностью соответствующего требованиям предприятия.',
    image:
      'https://btppiivskcahxrswlwzs.supabase.co/storage/v1/object/public/catalog-media/certificates/gratitude-mashinostroitel.jpg',
  },
  {
    id: 'gratitude-alfacom',
    category: 'award',
    title: 'Благодарность компании «Альфаком»',
    description:
      'Благодарность за оперативность, профессионализм и высокое качество услуг в сфере поставок оборудования Harrison и сопутствующего оснащения.',
    image:
      'https://btppiivskcahxrswlwzs.supabase.co/storage/v1/object/public/catalog-media/certificates/gratitude-alfacom.jpg',
  },
  {
    id: 'diploma-metalworking-2021',
    category: 'award',
    title: 'Диплом XXI выставки «Металлообработка-2021»',
    description:
      'Диплом за участие в 21-й международной специализированной выставке «Металлообработка-2021».',
    image:
      'https://btppiivskcahxrswlwzs.supabase.co/storage/v1/object/public/catalog-media/certificates/diploma-metalworking-2021.jpg',
    location: 'Москва, ЦВК «Экспоцентр»',
    issueDate: '24–28.05.2021',
  },
  {
    id: 'gratitude-numax',
    category: 'award',
    title: 'Благодарственное письмо «Нумакс»',
    description:
      'Благодарственное письмо за квалифицированную техническую поддержку и оперативные поставки высококачественного металлорежущего инструмента.',
    image:
      'https://btppiivskcahxrswlwzs.supabase.co/storage/v1/object/public/catalog-media/certificates/gratitude-numax.jpg',
  },
];