'use client';
import Shell from '@/components/Shell';
import ListingView from '@/components/ListingView';

export default function Page({ params }: { params: { id: string } }) {
  return <Shell active='catalogue'>{me => <ListingView id={params.id} meId={me.id} />}</Shell>;
}
