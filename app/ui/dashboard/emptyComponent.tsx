"use client";
import React from 'react';
import { useSession } from 'next-auth/react';
function EmptyComponent() {
    
  const { data: session } = useSession();
  return (
    <div>{JSON.stringify(session)}</div>
  )
}

export default EmptyComponent