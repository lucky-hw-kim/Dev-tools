import React, { useRef, useEffect, useReducer, useState } from 'react';
import Webcam from 'react-webcam';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import * as mobilenet from "@tensorflow-models/mobilenet";
import * as knnClassifier from "@tensorflow-models/knn-classifier";
import * as tf from '@tensorflow/tfjs';
import classes from './Backcare.module.css';

import axios from 'axios';
import BarChart from './BarChart';

import {ImHappy, ImSad} from 'react-icons/im'
import {IoIosCloseCircleOutline} from 'react-icons/io'


ChartJS.register(ArcElement, Tooltip, Legend);

const videoConstraints = {
  width: 640,
  height: 480,
  facingMode: "user"
};

const initialState = {
  goodPostureCount: 0,
  badPostureCount: 0,
  displayGraph: false,
  isTrained: false,
  currentTestResult: false,
  intervalId: null
};

const reducer = (state, action) => {
  switch (action.type) {
    case 'INCREMENT_GOOD_POSTURE_COUNT':
      return { ...state, goodPostureCount: action.value };
    case 'INCREMENT_BAD_POSTURE_COUNT':
      return { ...state, badPostureCount: action.value };
    case 'DISPLAY_GRAPH':
      return { ...state, displayGraph: action.value };
    case 'IS_TRAINED':
      return { ...state, isTrained: action.value };
    case 'TEST_RESULT':
      return { ...state, currentTestResult: action.result };
    case 'SET_INTERVAL':
      return { ...state, intervalId: action.intervalId };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
};
let data = { good: 0, bad: 0 };

const Backcare = () => {

  const [classifier, setClassifier] = useState(knnClassifier.create());


  const videoElement = useRef(null);

  const [instruction, setInstruction] = useState(true)
  const [state, dispatchBackcare] = useReducer(reducer, initialState);

  useEffect(() => {

    //get the modal from backend if uesr has already trained it
    //set the classifier dataset from the backend data
    //set is_trained to true

    let modelData = '';

    axios.get('api/datalab/backcare/model')
      .then(result => {
        modelData = result.data.backcare_model;
        if (modelData) {
          dispatchBackcare({ type: 'IS_TRAINED', value: true });
          classifier.setClassifierDataset(Object.fromEntries(
            JSON.parse(modelData).map(([label, dataM, shape]) => [label, tf.tensor(dataM, shape)])
          ));
        }
        else {
          dispatchBackcare({ type: 'IS_TRAINED', value: false });
        }
      })
      .catch(e => console.error(e));
  }, [classifier]);


  /* const stopCam = () => {
    let stream = videoElement.current.stream;
    const tracks = stream.getTracks();
    tracks.forEach(track => track.stop());
  }; */

  const train = async (classId) => {
    const img = tf.browser.fromPixels(videoElement.current.video);
    const model = await mobilenet.load();
    const activation = model.infer(img, true);
    classifier.addExample(activation, classId);

    if (classId === "good") {
      dispatchBackcare({ type: 'INCREMENT_GOOD_POSTURE_COUNT', value: state.goodPostureCount + 1 });
    }

    if (classId === "bad") {
      dispatchBackcare({ type: 'INCREMENT_BAD_POSTURE_COUNT', value: state.badPostureCount + 1 });
    }
  };

  const handleEndTraining = () => {
    
    setInstruction(false);

    dispatchBackcare({ type: 'IS_TRAINED', value: true });
    data = { good: 0, bad: 0 };

    const modelData = JSON.stringify(Object.entries(classifier.getClassifierDataset())
      .map(([label, dataM]) => [label, Array.from(dataM.dataSync()), dataM.shape]));

    axios.put(`/api/datalab/backcare/model`, { model: modelData })
      .then(result => console.log(result.data))
      .catch(e => console.error(e));

  };


  //Delets the model data from backend
  const handleResetTraining = () => {
    dispatchBackcare({ type: 'RESET', value: false });
    setClassifier(knnClassifier.create());
    axios.patch(`/api/datalab/backcare/model`)
      .then(result => console.log(result.data))
      .catch(e => console.error(e));
  };


  //Continuious monitoring of the subject for posture data
  const classifyPosture = async () => {
    const intervalId = setInterval(async () => {
      let model = await mobilenet.load();
      const img = tf.browser.fromPixels(videoElement.current.video);
      const activation = model.infer(img, true);
      const result = await classifier.predictClass(activation);
      data[result.label] = data[result.label] + 1;
      console.table(data);
    }, 5000);


    dispatchBackcare({ type: 'SET_INTERVAL', intervalId });

    //send the current data of postures to backend

  };

  const stopPostureTracking = () => {

    clearInterval(state.intervalId);
    dispatchBackcare({ type: 'DISPLAY_GRAPH', value: true });

    axios.post(`/api/datalab/backcare/data?good=${data.good}&bad=${data.bad}`)
      .then(result => console.log(result.data))
      .catch(e => console.error(e));
  };




  //Testing the model training
  const classifySample = async () => {
    dispatchBackcare({ type: 'TEST_RESULT', result: false });
    let model = await mobilenet.load();
    const img = tf.browser.fromPixels(videoElement.current.video);
    const activation = model.infer(img, true);
    const result = await classifier.predictClass(activation);

    data[result.label] = data[result.label] + 1;
    // dispatchBackcare({ type: 'TEST_RESULT', result: result.label });
    if(result.label === 'good') {
      dispatchBackcare({ type: 'TEST_RESULT', result: <ImHappy style={{color: "#9fd1bb"}}/> });
    }else {
      dispatchBackcare({ type: 'TEST_RESULT', result: <ImSad style={{color: "#e290ade1"}} />   });
    }
  };


  const graphdata = {
    labels: ['Bad posture', 'Good posture'],
    datasets: [
      {
        label: '# count',
        data: [data.bad, data.good],
        backgroundColor: [
          'rgba(220, 38, 38, 0.7)',
          'rgba(0, 153, 246, 0.7)',
        ],
        borderColor: [
          'rgba(220, 38, 38, 1)',
          'rgba(0, 153, 246, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <>
    <div className={state.displayGraph ? classes.backDrop : classes.bigContainer} >
      <h2 className={ classes.heading }>Backcare watches your back</h2>
      <h3 className={ classes.subHeading }>Track your posture in real-time</h3>

      <div className={ classes.container }>
        <div className={ classes.screen }>
        <div className={ classes.instruction }>
          <h3>Instruction:</h3>
          {instruction && 
          <ul className={ classes.list }>
            <li>1. Take multiple photos of good postures and bad postures
            </li>
            <li>
            2. You can test it by clicking 'Test'
            </li>
            <li>
            3. Once you are satisfied with your result, click 'Done'
            </li>
          </ul> }
          { !instruction && (
            <ul className={ classes.list2 }>
              <li>
                4. Click Track your posture to start tracking
              </li>
              <li>
                5. When are done simply click stop tracking
              </li>
              <li>
                6. You will get a record of your posture
              </li>
            </ul>
          )
          }
          </div>
          <Webcam
            className={ classes.camera }
            screenshotFormat="image/jpeg"
            screenshotQuality={ 1 }
            audio={ false }
            ref={ videoElement }
            videoConstraints={ videoConstraints }
          />
        </div>
        <div className={ classes.seperator}>
        { !state.isTrained && <div className={ classes.btncontainer }>
          <div className={ classes.btnCol } >
          <button
            className={ `${classes.btn} ${classes.green}` }
            onClick={ () => train('good') }>
            <ImHappy style={{fontSize: "1.5em"}}/>
          </button>
          <button
            className={ `${classes.btn} ${classes.red}` }
            onClick={ () => train('bad') }>
            <ImSad style={{fontSize: "1.5em"}}/>
      
          </button>
          </div>
          <div className={ classes.btnCol }>
          <button
            className={ `${classes.btn} ${classes.blue}` }
            onClick={ classifySample }>
            Test </button>

          <button

            className={ `${classes.btn} ${classes.blue}` }
            onClick={ handleEndTraining }>
            Done</button>
          </div>
        </div> }
        <div className={ classes.msgContainer }>
          <div className={classes.postureCountContainer}>
            <div className={ classes.postureCount }>Good Posture: { state.goodPostureCount }</div>
            <div className={ classes.postureCount }>Bad Posture: { state.badPostureCount }</div>
          </div>
            <div className={ classes.resultMsg }>
              { state.currentTestResult && (state.currentTestResult) }
            </div>
          </div>
        </div>

            { 
              state.intervalId && <div className={classes.startTracking}>Tracking posture in progress...</div>
            }

        { state.isTrained && <div className={ classes.btnContainer2 }>
          <button
            className={ `${classes.btn} ${classes.blue}` }
            onClick={ handleResetTraining }>
            ReTrain</button>
          <button
            className={ `${classes.btn} ${classes.blue}` }
            onClick={ classifyPosture }>
            Track your posture</button>
          <button
            className={ `${classes.btn} ${classes.blue}` }
            onClick={ stopPostureTracking }>
            Stop tracking</button>
        </div> }
      </div>
      </div>
        { state.displayGraph && <div className={ classes.graph }>
        <div className={ classes.graphHeader }>
          <h3 className={ classes.graphHeading }>Posture Record</h3>
          <button onClick={()=>{
            dispatchBackcare({ type: 'DISPLAY_GRAPH', value: false })}
        } class={classes.closeBtn}><IoIosCloseCircleOutline/></button>
        </div>
          <Pie data={ graphdata } />
          <BarChart />
        </div> }
    </>
  );
};

export default Backcare;