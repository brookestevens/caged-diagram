import { useEffect, useState } from 'react'
import type { ChangeEventHandler, ChangeEvent } from 'react';
import './App.css'

type Note = string;

interface SelectProps {
  onSelect: ChangeEventHandler,
  selected: string|number
}

const notes:Array<Note> = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const modes = [
  {name: 'Ionian', degree: 0, shapes: [[5], [3,4], [2], [0, 1], [6]] }, // 5 + (0 + 2) = 9
  {name: 'Dorian', degree: 1, shapes: [[6], [4,5], [3], [1, 2], [0]] }, // 5 + (1 + 2) = 10
  {name: 'Phrygian', degree: 2, shapes: [[6, 0], [5], [4], [2, 3], [1]]}, // 5 + (2 + 2) = 11
  {name: 'Lydian', degree: 3, shapes: [[0, 1], [6], [5], [3, 4], [2]]},   //5 + (3 + 2) = 12
  {name: 'Mixolydian', degree: 4, shapes: [[2], [0, 1], [6], [4, 5], [3]] }, // 5 + (4 + 2) = 13
  {name: 'Aeolian', degree: 5, shapes: [[3], [1, 2], [6, 0], [5, 6], [4]]}, // 5 + (5 + 2) = 7
  {name: 'Locrian', degree: 6, shapes: [[4], [2, 3], [1], [6, 0], [5]]},  // 5 + (6 + 2) = 8
];

const NoteSelector = (props:SelectProps) => {
  const { onSelect } = props;
  return (
    <div className='form-group'>
      <label> Key </label>
      <select onChange={onSelect}>
        {notes.map((note) => <option key={note} value={note}> {note} </option> )}
      </select>
    </div>
  );
}

const ModeSelector = (props:SelectProps) => {
  const { onSelect } = props;
  return (
    <div className='form-group'>
      <label> Mode </label>
      <select onChange={onSelect}>
      {modes.map((mode) => <option key={mode.degree} value={mode.degree}> {mode.name} </option> )}
      </select>
    </div>
  );
}

const getRomanNumeral = (degree:number, type:string) => {
  switch(degree) {
    case 0:
      return type == 'M' ? 'I' : (type === 'm' ? 'i' : 'i°')
    case 1:
      return type == 'M' ? 'II' : (type === 'm' ? 'ii' : 'ii°')
    case 2:
      return type == 'M' ? 'III' : (type === 'm' ? 'iii' : 'iii°')
    case 3:
      return type == 'M' ? 'IV' : (type === 'm' ? 'iv' : 'iv°')
    case 4:
      return type == 'M' ? 'V' : (type === 'm' ? 'v' : 'v°')
    case 5:
      return type == 'M' ? 'VI' : (type === 'm' ? 'vi' : 'vi°')
    case 6:
      return type == 'M' ? 'VII' : (type === 'm' ? 'vii' : 'vii°')
  }
}

const getNotesFromMode = (key:Note, mode:number) => {
  const intervals = [
    {interval: 2, type: 'm'},
    {interval: 2, type: 'm'},
    {interval: 1, type: 'M'},
    {interval: 2, type: 'M'},
    {interval: 2, type: 'm'},
    {interval: 2, type: 'd'},
    {interval: 1, type: 'M'},
  ];
  const shifted = intervals.splice(0, mode);
  intervals.push(...shifted);
  const rootOffset = notes.indexOf(key);
  let i = 0;
  const scale: Array<{note: Note, type: string}> = [];
  intervals.forEach((interval) => {
    i = i + interval.interval;
    scale.push({
      note: notes[(rootOffset + i) % 12],
      type: interval.type
    });
  });
  const root = scale.pop();
  if (root) {
    scale.unshift(root);
  }
  return scale;
}

function knuthShuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const generateRandomInterval = () => {
  const num = Math.floor(Math.random() * 3);
  if (num === 0) {
    return '1'
  }
  if (num === 1) {
    return '3';
  }
  if (num === 2) {
    return '5';
  }
}

function App() {
  const [key, setKey] = useState(notes[0]);
  const [mode, setMode] = useState(0);
  const [view, setView] = useState('interval');
  const [scale, setScale] = useState([]);
  const [highlight, setHighlight] = useState(0);
  const [progression, setProgression] = useState([]);

  useEffect(() => {
    const _scale = getNotesFromMode(key, mode);
    setScale(_scale);
  }, [key, mode]);

  function renderRows() {
    const renderTd = (heading:string, degrees:Array<Array<number>>) => {
      return (
        <tr key={heading}>
          <th> {heading}</th>
          {degrees.map((degree:Array<number>, index:number) =>
            <td key={`${heading}-${index}`} className={`${degree.includes(highlight) ? 'highlight' : ''}`} >
            { view === 'interval' ?
              degree.map((d) => getRomanNumeral(d, scale[d].type)).join(' / ') : 
              degree.map((d) => scale[d].note ).join(' / ') }
            </td>
          )}
        </tr>
      );
    }
    const row = [];
    modes.forEach((m) => {
      // Get the shifted shape.
      const offset = 7 - mode;
      const { shapes } = modes[(m.degree + offset) % 7];
      row.push(renderTd(m.name, shapes));
    });
    return row;
  }

  function generateProgression() {
    const arr = knuthShuffle([...scale]);
    setProgression(arr);
  }

  return (
    <div>
      <h1> CAGED Shapes in Scale Shapes</h1>
      <div className='flex'>
        <NoteSelector selected={key} onSelect={(e: ChangeEvent) => setKey((e.target as HTMLSelectElement).value) } />
        <ModeSelector selected={mode} onSelect={(e: ChangeEvent) => setMode(parseInt((e.target as HTMLSelectElement).value, 10)) }/>
        <div className='form-group'>
          <label> Table View </label>
          <select onChange={(e) => setView(e.target.value)}>
            <option value='interval'> Interval </option>
            <option value='note'> Note </option>
          </select>
        </div>
      </div>
      <hr/>
      <div className='flex'>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>C (5th)</th>
              <th>A (5th)</th>
              <th>G (6th)</th>
              <th>E (6th)</th>
              <th>D (4th)</th>
            </tr>
          </thead>
          <tbody>
          {scale.length > 0 && renderRows()}
          </tbody>
        </table>
        <ul>
          {scale.length > 0 && scale.map((s, index) =>
          <li 
            onClick={() => setHighlight(index)}
            className={`${highlight === index ? 'highlight' : ''}`}
            key={s.note}>
              {s.note + ' - ' + getRomanNumeral(index, s.type) }
            </li >)}
        </ul>
      </div>
      <div>
        <button onClick={generateProgression}> generate chord progression </button>
        <div>
          { progression.map((degree) => <li key={degree.note}> {degree.note} | {generateRandomInterval()} </li>) }
        </div>
      </div>
    </div>
  )
}

export default App
