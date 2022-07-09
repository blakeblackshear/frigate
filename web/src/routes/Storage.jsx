import { h, Fragment } from 'preact';
import ActivityIndicator from '../components/ActivityIndicator';
import Button from '../components/Button';
import Heading from '../components/Heading';
import Link from '../components/Link';
import { useMqtt } from '../api/mqtt';
import useSWR from 'swr';
import { Table, Tbody, Thead, Tr, Th, Td } from '../components/Table';
import { useCallback } from 'preact/hooks';

export default function Storage() {
  const { data: storage } = useSWR('recordings/storage');

  return (
    <div className="space-y-4 p-2 px-4">
      <Heading>
        Storage
      </Heading>
    </div>
  );
}