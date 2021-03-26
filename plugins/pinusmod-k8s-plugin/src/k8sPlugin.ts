import { IPlugin } from 'pinusmod';
import { K8sComponent } from './components/k8sComponent';

/**
 * 实现 k8s 插件
 */
export class K8sPlugin implements IPlugin {
    name = 'k8sPlugin';
    components = [K8sComponent];
}
