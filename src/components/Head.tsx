const siteUrl = 'https://cnc.su';
const siteName = 'АВТОграф Инструментальные Решения';
const description =
  'Комплексные поставки металлорежущего инструмента, станочной оснастки, СОЖ, измерительного инструмента и инженерных услуг для производственных предприятий.';
const ogImage = `${siteUrl}/images/logo/logo.svg`;

export const Head = () => {
  return (
    <>
      <meta charSet="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="description" content={description} />

      <link rel="canonical" href={siteUrl} />
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

      <meta property="og:type" content="website" />
      <meta property="og:title" content={siteName} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={siteUrl} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="ru_RU" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={siteName} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      <link rel="preconnect" href="https://static.parastorage.com" />
    </>
  );
};
