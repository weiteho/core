/*
  Because the runtime-p2p module may or may not be there, this module provides
  a uniform interface to either the real p2p module or a safe stubbed out version
*/

// built-in modules
import { EventEmitter } from 'events';

// npm modules
// (none)

// local modules
import { Identity } from './api_protocol/transport_strategy/api_transport_base';
import { ArgMap, PortInfo } from './port_discovery';
import * as log from './log';
import * as  coreState from './core_state';
import { PeerConnectionManager } from './runtime_p2p/peer_connection_manager';
import { Fin } from '../../js-adapter/src/main';

const enableMeshFlag = 'enable-mesh';
const securityRealmFlag = 'security-realm';

let connectionManager: any;
let meshEnabled = false;

buildNoopConnectionManager();

function startConnectionManager() {
    try {
        connectionManager = new PeerConnectionManager();
        meshEnabled = true;
        log.writeToLog('info', 'multi-runtime mode enabled');
    } catch (e) {
      log.writeToLog('info', e.message);
    }
}

function buildNoopConnectionManager() {
    connectionManager = new EventEmitter();
    connectionManager.connectToRuntime = () => {
        return new Promise((resolve, reject) => {
            reject();
        });
    };

    connectionManager.resolveIdentity = () => {
        return new Promise((resolve, reject) => {
            reject();
        });
    };

    connectionManager.connections = [];
}

function isMeshEnabled(args: ArgMap = {}) {
    let enabled = false;
    const enableMesh = args[enableMeshFlag];
    const securityRealm = args[securityRealmFlag];

    if (!securityRealm || enableMesh) {
        enabled = true;
    }

    return enabled;
}

function isMeshEnabledRuntime(portInfo: PortInfo) {
    return portInfo.multiRuntime === true;
}

function keyFromPortInfo(portInfo: PortInfo): string {
    const { version, port, securityRealm = '' } = portInfo;
    return `${version}/${port}/${securityRealm}`;
}

if (isMeshEnabled(coreState.argo)) {
    startConnectionManager();
}

function getMeshUuid(): string {
    const portInfo = <PortInfo>coreState.getSocketServerState();
    return keyFromPortInfo(portInfo);
}
/*
  Note that these should match the definitions found here:
  https://github.com/openfin/runtime-p2p/blob/master/src/connection_manager.ts
*/

interface PeerRuntime {
    portInfo: PortInfo;
    fin: Fin;
    isDisconnected: boolean;
}

interface IdentityAddress {
    runtime: PeerRuntime;
    runtimeKey: string;
    identity: Identity;
}

interface ConnectionManager extends EventEmitter {
    connections: Array<PeerRuntime>;
    connectToRuntime: (uuid: string, portInfo: PortInfo) => Promise<PeerRuntime>;
    resolveIdentity(identity: Identity): Promise<IdentityAddress>;
}

export default <ConnectionManager>connectionManager;
export { meshEnabled, PeerRuntime, isMeshEnabled, keyFromPortInfo, getMeshUuid, isMeshEnabledRuntime };
