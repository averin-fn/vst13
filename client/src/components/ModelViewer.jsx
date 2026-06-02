import { Suspense, useMemo, Component } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';

const GROUND_Y = -1;

// Заглушка: процедурная фигура бойца из примитивов.
// Когда у участника появится поле model_url с .glb-файлом,
// вместо неё отрисуется реальная модель (см. GLBModel ниже).
function PlaceholderSoldier() {
  const khaki = '#707d52'; // foliage green
  const darkGear = '#3a4127'; // тёмный оливковый
  const skin = '#c6a279';

  // Нижняя точка ног (капсулы r=0.16, центр y=0.35, длина 0.85) ≈ -0.235.
  // Сдвигаем группу так, чтобы ступни стояли на уровне GROUND_Y.
  return (
    <group position={[0, GROUND_Y + 0.235, 0]}>
      {/* Голова */}
      <mesh position={[0, 1.95, 0]} castShadow>
        <sphereGeometry args={[0.26, 32, 32]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      {/* Каска */}
      <mesh position={[0, 2.08, 0]} castShadow>
        <sphereGeometry args={[0.3, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={darkGear} />
      </mesh>
      {/* Шея */}
      <mesh position={[0, 1.68, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.18, 16]} />
        <meshStandardMaterial color={skin} />
      </mesh>
      {/* Корпус / разгрузка */}
      <mesh position={[0, 1.15, 0]} castShadow>
        <boxGeometry args={[0.78, 0.95, 0.42]} />
        <meshStandardMaterial color={khaki} />
      </mesh>
      <mesh position={[0, 1.2, 0.24]}>
        <boxGeometry args={[0.62, 0.6, 0.12]} />
        <meshStandardMaterial color={darkGear} />
      </mesh>
      {/* Руки */}
      {[-0.52, 0.52].map((x) => (
        <mesh key={x} position={[x, 1.15, 0]} castShadow>
          <capsuleGeometry args={[0.13, 0.7, 8, 16]} />
          <meshStandardMaterial color={khaki} />
        </mesh>
      ))}
      {/* Ноги */}
      {[-0.21, 0.21].map((x) => (
        <mesh key={x} position={[x, 0.35, 0]} castShadow>
          <capsuleGeometry args={[0.16, 0.85, 8, 16]} />
          <meshStandardMaterial color={darkGear} />
        </mesh>
      ))}
      {/* Привод (упрощённо) */}
      <group position={[0.34, 1.05, 0.32]} rotation={[0, 0, -0.25]}>
        <mesh>
          <boxGeometry args={[0.12, 0.12, 0.95]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        <mesh position={[0, -0.16, -0.18]}>
          <boxGeometry args={[0.1, 0.3, 0.12]} />
          <meshStandardMaterial color="#1a1a1a" />
        </mesh>
      </group>
    </group>
  );
}

function GLBModel({ url }) {
  const { scene } = useGLTF(url);
  // Авто-выравнивание: сдвигаем модель так, чтобы её нижняя точка стояла на сетке.
  // Клонируем, чтобы не модифицировать общий ресурс useGLTF (кэшируется по url).
  const positioned = useMemo(() => {
    const copy = scene.clone(true);
    const box = new THREE.Box3().setFromObject(copy);
    if (Number.isFinite(box.min.y)) {
      copy.position.y += GROUND_Y - box.min.y;
    }
    return copy;
  }, [scene]);
  return <primitive object={positioned} />;
}

function Loader() {
  return <Html center>Загрузка модели…</Html>;
}

// Если .glb не загрузился (битый файл, 404 и т.п.) — useGLTF бросает исключение.
// Suspense ловит только загрузку, но не ошибки, поэтому без этого границы
// падал бы весь ParticipantDetail. Здесь подменяем модель на заглушку-бойца.
class ModelErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(prevProps) {
    // Сброс ошибки при смене модели (например, переход к другому участнику)
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export default function ModelViewer({ modelUrl }) {
  return (
    <div className="model-viewer">
      <Canvas shadows camera={{ position: [2.6, 1.6, 3.2], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={1.1} castShadow />
        <directionalLight position={[-5, 3, -4]} intensity={0.4} />
        <ModelErrorBoundary resetKey={modelUrl} fallback={<PlaceholderSoldier />}>
          <Suspense fallback={<Loader />}>
            {modelUrl ? <GLBModel url={modelUrl} /> : <PlaceholderSoldier />}
          </Suspense>
        </ModelErrorBoundary>
        <gridHelper args={[8, 16, '#3a3f2a', '#23261a']} position={[0, -1, 0]} />
        <OrbitControls
          enablePan={false}
          minDistance={2}
          maxDistance={7}
          autoRotate
          autoRotateSpeed={0.8}
        />
      </Canvas>
      <span className="model-hint">Зажмите и тяните, чтобы вращать модель</span>
    </div>
  );
}
