import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Card, CYAN, DANGER, HIGH, MEDIUM, LOW, MUTED } from "@/components/gds/GDSOSShared";
import { Globe, Shield, AlertTriangle } from "lucide-react";

const ASSET_LOCATIONS = [
  { lat: 51.5074, lng: -0.1278, type: "datacenter", severity: "low", assets: 45, name: "London DC" },
  { lat: 40.7128, lng: -74.0060, type: "datacenter", severity: "medium", assets: 67, name: "NYC DC" },
  { lat: 35.6762, lng: 139.6503, type: "datacenter", severity: "high", assets: 89, name: "Tokyo DC" },
  { lat: 52.5200, lng: 13.4050, type: "endpoint", severity: "low", assets: 23, name: "Berlin Hub" },
  { lat: 48.8566, lng: 2.3522, type: "endpoint", severity: "critical", assets: 34, name: "Paris Hub" },
  { lat: 37.7749, lng: -122.4194, type: "cloud", severity: "medium", assets: 156, name: "SF Cloud" },
  { lat: -33.8688, lng: 151.2093, type: "datacenter", severity: "low", assets: 28, name: "Sydney DC" },
  { lat: 1.3521, lng: 103.8198, type: "endpoint", severity: "high", assets: 41, name: "Singapore Hub" },
];

const THREAT_CLUSTERS = [
  { lat: 55.7558, lng: 37.6173, intensity: 0.9, type: "ddos", count: 234, name: "Moscow" },
  { lat: 39.9042, lng: 116.4074, intensity: 0.7, type: "intrusion", count: 156, name: "Beijing" },
  { lat: -23.5505, lng: -46.6333, intensity: 0.5, type: "malware", count: 89, name: "Sao Paulo" },
];

const SEVERITY_COLOR = { critical: DANGER, high: HIGH, medium: MEDIUM, low: LOW };

export default function GlobalThreatMap() {
  const containerRef = useRef(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const globeRef = useRef(null);
  const assetsGroupRef = useRef(null);
  const threatsGroupRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020817);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, containerRef.current.clientWidth / 400, 0.1, 1000);
    camera.position.z = 18;
    camera.position.y = 8;
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(containerRef.current.clientWidth, 400);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const globeGeometry = new THREE.SphereGeometry(6, 64, 64);
    const globeMaterial = new THREE.MeshPhongMaterial({
      color: 0x0a1628,
      emissive: 0x001133,
      specular: 0x00d4ff,
      shininess: 100,
      transparent: true,
      opacity: 0.95,
    });
    const globe = new THREE.Mesh(globeGeometry, globeMaterial);
    scene.add(globe);
    globeRef.current = globe;

    const wireframeGeometry = new THREE.SphereGeometry(6.05, 32, 32);
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    });
    const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
    scene.add(wireframe);

    const assetsGroup = new THREE.Group();
    const threatsGroup = new THREE.Group();
    scene.add(assetsGroup);
    scene.add(threatsGroup);
    assetsGroupRef.current = assetsGroup;
    threatsGroupRef.current = threatsGroup;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x00d4ff, 1.2, 100);
    pointLight.position.set(15, 15, 15);
    scene.add(pointLight);

    const latLngToVector3 = (lat, lng, radius = 6.15) => {
      const phi = (90 - lat) * (Math.PI / 180);
      const theta = (lng + 180) * (Math.PI / 180);
      const x = -(radius * Math.sin(phi) * Math.cos(theta));
      const z = radius * Math.sin(phi) * Math.sin(theta);
      const y = radius * Math.cos(phi);
      return new THREE.Vector3(x, y, z);
    };

    ASSET_LOCATIONS.forEach((asset) => {
      const position = latLngToVector3(asset.lat, asset.lng);
      const color = SEVERITY_COLOR[asset.severity] || LOW;

      const markerGeometry = new THREE.SphereGeometry(0.18, 16, 16);
      const markerMaterial = new THREE.MeshPhongMaterial({
        color: new THREE.Color(color),
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.6,
      });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.copy(position);
      marker.userData = { ...asset, type: "asset" };
      assetsGroup.add(marker);

      const ringGeometry = new THREE.RingGeometry(0.25, 0.32, 32);
      const ringMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.position.copy(position);
      ring.lookAt(new THREE.Vector3(0, 0, 0));
      ring.userData = { isPulse: true };
      assetsGroup.add(ring);
    });

    THREAT_CLUSTERS.forEach((threat) => {
      const position = latLngToVector3(threat.lat, threat.lng);
      const threatColor = new THREE.Color(DANGER);

      const coneGeometry = new THREE.ConeGeometry(0.35, 1.0, 16);
      const coneMaterial = new THREE.MeshPhongMaterial({
        color: threatColor,
        emissive: threatColor,
        emissiveIntensity: 0.9,
        transparent: true,
        opacity: 0.95,
      });
      const cone = new THREE.Mesh(coneGeometry, coneMaterial);
      cone.position.copy(position);
      cone.lookAt(new THREE.Vector3(0, 0, 0));
      cone.rotateX(Math.PI);
      cone.userData = { ...threat, type: "threat" };
      threatsGroup.add(cone);

      const threatRingGeometry = new THREE.RingGeometry(0.45, 0.55, 32);
      const threatRingMaterial = new THREE.MeshBasicMaterial({
        color: threatColor,
        transparent: true,
        opacity: 0.65,
        side: THREE.DoubleSide,
      });
      const threatRing = new THREE.Mesh(threatRingGeometry, threatRingMaterial);
      threatRing.position.copy(position);
      threatRing.lookAt(new THREE.Vector3(0, 0, 0));
      threatRing.userData = { isThreatPulse: true };
      threatsGroup.add(threatRing);
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleMouseMove = (event) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects([...assetsGroup.children, ...threatsGroup.children]);

      if (intersects.length > 0) {
        const object = intersects[0].object;
        containerRef.current.style.cursor = "pointer";
        if (object.userData && !selectedAsset) {
          setSelectedAsset(object.userData);
        }
      } else {
        containerRef.current.style.cursor = "default";
        if (selectedAsset) setSelectedAsset(null);
      }
    };

    containerRef.current.addEventListener("mousemove", handleMouseMove);
    containerRef.current.addEventListener("mouseleave", () => setSelectedAsset(null));

    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      globe.rotation.y += 0.0015;
      wireframe.rotation.y += 0.0015;
      assetsGroup.rotation.y += 0.0015;
      threatsGroup.rotation.y += 0.0015;

      const time = Date.now() * 0.002;
      assetsGroup.children.forEach((child) => {
        if (child.userData.isPulse) {
          const scale = 1 + Math.sin(time) * 0.25;
          child.scale.set(scale, scale, scale);
        }
      });

      threatsGroup.children.forEach((child) => {
        if (child.userData.isThreatPulse) {
          const scale = 1 + Math.sin(time * 1.5) * 0.35;
          child.scale.set(scale, scale, scale);
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / 400;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, 400);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      containerRef.current?.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationId);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      globeGeometry.dispose();
      globeMaterial.dispose();
      wireframeGeometry.dispose();
      wireframeMaterial.dispose();
    };
  }, [selectedAsset]);

  return (
    <Card className="relative overflow-hidden" style={{ background: "#020817", border: `1px solid ${CYAN}30` }}>
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
        <Globe className="w-5 h-5" style={{ color: CYAN }} />
        <h3 className="text-sm font-bold text-white">GLOBAL THREAT MAP</h3>
        <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: `${LOW}15`, color: LOW }}>LIVE</span>
      </div>

      <div ref={containerRef} className="w-full h-[400px]" />

      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: SEVERITY_COLOR.critical }} />
            <span className="text-[9px] font-bold" style={{ color: MUTED }}>Critical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: SEVERITY_COLOR.high }} />
            <span className="text-[9px] font-bold" style={{ color: MUTED }}>High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: SEVERITY_COLOR.medium }} />
            <span className="text-[9px] font-bold" style={{ color: MUTED }}>Medium</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: SEVERITY_COLOR.low }} />
            <span className="text-[9px] font-bold" style={{ color: MUTED }}>Low</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold" style={{ color: MUTED }}>{ASSET_LOCATIONS.length} assets</span>
          <span className="text-[9px] font-bold" style={{ color: MUTED }}>·</span>
          <span className="text-[9px] font-bold" style={{ color: MUTED }}>{THREAT_CLUSTERS.length} threat clusters</span>
        </div>
      </div>

      {selectedAsset && (
        <div className="absolute top-16 right-4 w-64 p-4 rounded-xl backdrop-blur-md"
          style={{ background: "rgba(10,22,40,0.95)", border: `1px solid ${selectedAsset.type === "threat" ? DANGER : CYAN}40` }}>
          <div className="flex items-center gap-2 mb-2">
            {selectedAsset.type === "threat" ? (
              <AlertTriangle className="w-4 h-4" style={{ color: DANGER }} />
            ) : (
              <Shield className="w-4 h-4" style={{ color: SEVERITY_COLOR[selectedAsset.severity] }} />
            )}
            <span className="text-xs font-bold text-white">{selectedAsset.name || `${selectedAsset.type.toUpperCase()}`}</span>
          </div>
          {selectedAsset.type === "asset" ? (
            <>
              <div className="flex items-center justify-between text-[9px] mb-1">
                <span style={{ color: MUTED }}>Type</span>
                <span className="text-white uppercase">{selectedAsset.type}</span>
              </div>
              <div className="flex items-center justify-between text-[9px] mb-1">
                <span style={{ color: MUTED }}>Severity</span>
                <span className="font-bold" style={{ color: SEVERITY_COLOR[selectedAsset.severity] }}>{selectedAsset.severity.toUpperCase()}</span>
              </div>
              <div className="flex items-center justify-between text-[9px]">
                <span style={{ color: MUTED }}>Assets</span>
                <span className="text-white">{selectedAsset.assets}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between text-[9px] mb-1">
                <span style={{ color: MUTED }}>Type</span>
                <span className="text-white uppercase">{selectedAsset.type}</span>
              </div>
              <div className="flex items-center justify-between text-[9px] mb-1">
                <span style={{ color: MUTED }}>Intensity</span>
                <span className="text-white">{Math.round(selectedAsset.intensity * 100)}%</span>
              </div>
              <div className="flex items-center justify-between text-[9px]">
                <span style={{ color: MUTED }}>Active Threats</span>
                <span className="text-white">{selectedAsset.count}</span>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  );
}