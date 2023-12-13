import * as THREE from 'three';

export function vector3Equals(v1: THREE.Vector3, v2: THREE.Vector3, epsilon = Number.EPSILON ) {
    return ( ( Math.abs( v1.x - v2.x ) < epsilon ) && ( Math.abs( v1.y - v2.y ) < epsilon ) && ( Math.abs( v1.z - v2.z ) < epsilon ) );
}

export function vector3ToString(vector: THREE.Vector3): string {
    vector.x = Number(vector.x.toFixed(2));
    vector.y = Number(vector.y.toFixed(2));
    vector.z = Number(vector.z.toFixed(2));
    return vector.toArray().toString();
}

export function stringToVector3(str: string): THREE.Vector3 {
    const vector = new THREE.Vector3().fromArray(str.split(',').map(Number));

    vector.x = Number(vector.x.toFixed(2));
    vector.y = Number(vector.y.toFixed(2));
    vector.z = Number(vector.z.toFixed(2));
    return vector;
}