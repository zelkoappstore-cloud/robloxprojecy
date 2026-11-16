'use client';
import Shell from '@/components/Shell';
import SellerView from '@/components/SellerView';

export default function Page({ params }: { params: { id: string } }) {
  return <Shell active='catalogue'>{me => <SellerView id={params.id} meId={me.id} />}</Shell>;
}
