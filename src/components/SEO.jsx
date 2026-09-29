import { Helmet } from 'react-helmet-async';

const SEO = ({ title, description, keywords }) => {
  return (
    <Helmet>
      <title>{title ? `${title} | AK Sales` : "AK Sales"}</title>
      <meta name="description" content={description || "Premium catering and refrigeration equipment by AK Sales."} />
      {keywords && <meta name="keywords" content={keywords} />}
    </Helmet>
  );
};

export default SEO;
