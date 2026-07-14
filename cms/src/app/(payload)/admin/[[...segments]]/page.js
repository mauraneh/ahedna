import config from '@payload-config';
import { RootPage, generatePageMetadata } from '@payloadcms/next/views';

export const generateMetadata = ({ params, searchParams }) =>
  generatePageMetadata({ config, params, searchParams });

export default function Page({ params, searchParams }) {
  return RootPage({ config, params, searchParams });
}
