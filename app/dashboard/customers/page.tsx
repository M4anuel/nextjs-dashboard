import { Metadata } from 'next';
import { getCases } from '@/app/lib/db';

export const metadata: Metadata = {
  title: 'Customers',
};


export default async function Page() {
  const entries = JSON.parse(await getCases());
  
  return <><p>Customer Page</p>
    {entries?.map((entry: any, index: number) => (
      <p>{index + entry.casecode}</p>
    ))}
  </>;
}