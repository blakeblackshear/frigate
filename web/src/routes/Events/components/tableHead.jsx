import { h } from 'preact';
import { Thead, Th, Tr } from '../../../components/Table';

const TableHead = () => (
  <Thead>
    <Tr>
      <Th />
      <Th>Camera</Th>
      <Th>Label</Th>
      <Th>Score</Th>
      <Th>Zones</Th>
      <Th>Retain</Th>
      <Th>Date</Th>
      <Th>Start</Th>
      <Th>End</Th>
    </Tr>
  </Thead>
);
export default TableHead;
