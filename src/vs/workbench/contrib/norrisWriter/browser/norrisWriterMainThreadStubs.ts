/*---------------------------------------------------------------------------------------------
 *  Copyright (c) David Norris. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { UriComponents } from '../../../../base/common/uri.js';
import { IProcessProperty, IProcessReadyWindowsPty } from '../../../../platform/terminal/common/terminal.js';
import { ISerializableEnvironmentDescriptionMap, ISerializableEnvironmentVariableCollection } from '../../../../platform/terminal/common/environmentVariable.js';
import { DebugConfigurationProviderTriggerKind } from '../../debug/common/debug.js';
import { CoverageDetails, ExtensionRunTestsRequest, IFileCoverage, ITestItem, ITestMessage, ITestRunProfile, ITestRunTask, ResolvedTestRunRequest, TestControllerCapability, TestResultState, TestsDiffOp } from '../../testing/common/testTypes.js';
import * as tasks from '../../../api/common/shared/tasks.js';
import {
	DebugSessionUUID,
	ExtHostTerminalIdentifier,
	IDebugConfiguration,
	IFunctionBreakpointDto,
	ISourceMultiBreakpointDto,
	IDataBreakpointDto,
	IStartDebuggingOptions,
	ILocationDto,
	ITestControllerPatch,
	MainContext,
	MainThreadDebugServiceShape,
	MainThreadTaskShape,
	MainThreadTerminalServiceShape,
	MainThreadTerminalShellIntegrationShape,
	MainThreadTestingShape,
	TerminalLaunchConfig,
} from '../../../api/common/extHost.protocol.js';
import { extHostNamedCustomer, IExtHostContext } from '../../../services/extensions/common/extHostCustomers.js';

/**
 * Norris Writer: IDE surfaces (debug, terminal, tasks, testing) are disabled.
 * These stubs register the corresponding MainContext proxies so the extension
 * host can start and built-in extensions (e.g. markdown preview) work.
 */

@extHostNamedCustomer(MainContext.MainThreadDebugService)
export class NorrisWriterMainThreadDebugStub implements MainThreadDebugServiceShape {

	constructor(_extHostContext: IExtHostContext) { }

	$registerDebugTypes(_debugTypes: string[]): void { }
	$sessionCached(_sessionID: string): void { }
	$acceptDAMessage(_handle: number, _message: DebugProtocol.ProtocolMessage): void { }
	$acceptDAError(_handle: number, _name: string, _message: string, _stack: string | undefined): void { }
	$acceptDAExit(_handle: number, _code: number | undefined, _signal: string | undefined): void { }
	$registerDebugConfigurationProvider(_type: string, _triggerKind: DebugConfigurationProviderTriggerKind, _hasProvideMethod: boolean, _hasResolveMethod: boolean, _hasResolve2Method: boolean, _handle: number): Promise<void> { return Promise.resolve(); }
	$registerDebugAdapterDescriptorFactory(_type: string, _handle: number): Promise<void> { return Promise.resolve(); }
	$unregisterDebugConfigurationProvider(_handle: number): void { }
	$unregisterDebugAdapterDescriptorFactory(_handle: number): void { }
	$startDebugging(_folder: UriComponents | undefined, _nameOrConfig: string | IDebugConfiguration, _options: IStartDebuggingOptions): Promise<boolean> { return Promise.resolve(false); }
	$stopDebugging(_sessionId: DebugSessionUUID | undefined): Promise<void> { return Promise.resolve(); }
	$setDebugSessionName(_id: DebugSessionUUID, _name: string): void { }
	$customDebugAdapterRequest(_id: DebugSessionUUID, _command: string, _args: unknown): Promise<unknown> { return Promise.resolve(undefined); }
	$getDebugProtocolBreakpoint(_id: DebugSessionUUID, _breakpoinId: string): Promise<DebugProtocol.Breakpoint | undefined> { return Promise.resolve(undefined); }
	$appendDebugConsole(_value: string): void { }
	$registerBreakpoints(_breakpoints: Array<ISourceMultiBreakpointDto | IFunctionBreakpointDto | IDataBreakpointDto>): Promise<void> { return Promise.resolve(); }
	$unregisterBreakpoints(_breakpointIds: string[], _functionBreakpointIds: string[], _dataBreakpointIds: string[]): Promise<void> { return Promise.resolve(); }
	$registerDebugVisualizer(_extensionId: string, _id: string): void { }
	$unregisterDebugVisualizer(_extensionId: string, _id: string): void { }
	$registerDebugVisualizerTree(_treeId: string, _canEdit: boolean): void { }
	$unregisterDebugVisualizerTree(_treeId: string): void { }
	dispose(): void { }
}

@extHostNamedCustomer(MainContext.MainThreadTerminalService)
export class NorrisWriterMainThreadTerminalStub implements MainThreadTerminalServiceShape {

	constructor(_extHostContext: IExtHostContext) { }

	$createTerminal(_extHostTerminalId: string, _config: TerminalLaunchConfig): Promise<void> { return Promise.resolve(); }
	$dispose(_id: ExtHostTerminalIdentifier): void { }
	$hide(_id: ExtHostTerminalIdentifier): void { }
	$sendText(_id: ExtHostTerminalIdentifier, _text: string, _shouldExecute: boolean): void { }
	$show(_id: ExtHostTerminalIdentifier, _preserveFocus: boolean): void { }
	$registerProcessSupport(_isSupported: boolean): void { }
	$registerProfileProvider(_id: string, _extensionIdentifier: string): void { }
	$unregisterProfileProvider(_id: string): void { }
	$registerCompletionProvider(_id: string, _extensionIdentifier: string, ..._triggerCharacters: string[]): void { }
	$unregisterCompletionProvider(_id: string): void { }
	$registerQuickFixProvider(_id: string, _extensionIdentifier: string): void { }
	$unregisterQuickFixProvider(_id: string): void { }
	$setEnvironmentVariableCollection(_extensionIdentifier: string, _persistent: boolean, _collection: ISerializableEnvironmentVariableCollection | undefined, _descriptionMap: ISerializableEnvironmentDescriptionMap): void { }
	$startSendingDataEvents(): void { }
	$stopSendingDataEvents(): void { }
	$startSendingCommandEvents(): void { }
	$stopSendingCommandEvents(): void { }
	$startLinkProvider(): void { }
	$stopLinkProvider(): void { }
	$sendProcessData(_terminalId: number, _data: string): void { }
	$sendProcessReady(_terminalId: number, _pid: number, _cwd: string, _windowsPty: IProcessReadyWindowsPty | undefined): void { }
	$sendProcessProperty(_terminalId: number, _property: IProcessProperty<any>): void { }
	$sendProcessExit(_terminalId: number, _exitCode: number | undefined): void { }
	dispose(): void { }
}

@extHostNamedCustomer(MainContext.MainThreadTerminalShellIntegration)
export class NorrisWriterMainThreadTerminalShellIntegrationStub implements MainThreadTerminalShellIntegrationShape {

	constructor(_extHostContext: IExtHostContext) { }

	$executeCommand(_terminalId: number, _commandLine: string): void { }
	dispose(): void { }
}

@extHostNamedCustomer(MainContext.MainThreadTask)
export class NorrisWriterMainThreadTaskStub implements MainThreadTaskShape {

	constructor(_extHostContext: IExtHostContext) { }

	$createTaskId(_task: tasks.ITaskDTO): Promise<string> { return Promise.resolve(''); }
	$registerTaskProvider(_handle: number, _type: string): Promise<void> { return Promise.resolve(); }
	$unregisterTaskProvider(_handle: number): Promise<void> { return Promise.resolve(); }
	$fetchTasks(_filter?: tasks.ITaskFilterDTO): Promise<tasks.ITaskDTO[]> { return Promise.resolve([]); }
	$getTaskExecution(_value: tasks.ITaskHandleDTO | tasks.ITaskDTO): Promise<tasks.ITaskExecutionDTO> { return Promise.resolve({ id: '', task: undefined }); }
	$executeTask(_task: tasks.ITaskHandleDTO | tasks.ITaskDTO): Promise<tasks.ITaskExecutionDTO> { return Promise.resolve({ id: '', task: undefined }); }
	$terminateTask(_id: string): Promise<void> { return Promise.resolve(); }
	$registerTaskSystem(_scheme: string, _info: tasks.ITaskSystemInfoDTO): void { }
	$customExecutionComplete(_id: string, _result?: number): Promise<void> { return Promise.resolve(); }
	$registerSupportedExecutions(_custom?: boolean, _shell?: boolean, _process?: boolean): Promise<void> { return Promise.resolve(); }
	dispose(): void { }
}

@extHostNamedCustomer(MainContext.MainThreadTesting)
export class NorrisWriterMainThreadTestingStub extends Disposable implements MainThreadTestingShape {

	constructor(_extHostContext: IExtHostContext) {
		super();
	}

	$registerTestController(_controllerId: string, _label: string, _capability: TestControllerCapability): void { }
	$updateController(_controllerId: string, _patch: ITestControllerPatch): void { }
	$unregisterTestController(_controllerId: string): void { }
	$subscribeToDiffs(): void { }
	$unsubscribeFromDiffs(): void { }
	$publishDiff(_controllerId: string, _diff: TestsDiffOp.Serialized[]): void { }
	$getCoverageDetails(_resultId: string, _taskIndex: number, _uri: UriComponents, _token: CancellationToken): Promise<CoverageDetails.Serialized[]> { return Promise.resolve([]); }
	$publishTestRunProfile(_config: ITestRunProfile): void { }
	$updateTestRunConfig(_controllerId: string, _configId: number, _update: Partial<ITestRunProfile>): void { }
	$removeTestProfile(_controllerId: string, _configId: number): void { }
	$runTests(_req: ResolvedTestRunRequest, _token: CancellationToken): Promise<string> { return Promise.resolve(''); }
	$addTestsToRun(_controllerId: string, _runId: string, _tests: ITestItem.Serialized[]): void { }
	$updateTestStateInRun(_runId: string, _taskId: string, _testId: string, _state: TestResultState, _duration?: number): void { }
	$appendTestMessagesInRun(_runId: string, _taskId: string, _testId: string, _messages: ITestMessage.Serialized[]): void { }
	$appendOutputToRun(_runId: string, _taskId: string, _output: VSBuffer, _location?: ILocationDto, _testId?: string): void { }
	$appendCoverage(_runId: string, _taskId: string, _coverage: IFileCoverage.Serialized): void { }
	$startedTestRunTask(_runId: string, _task: ITestRunTask): void { }
	$finishedTestRunTask(_runId: string, _taskId: string): void { }
	$startedExtensionTestRun(_req: ExtensionRunTestsRequest): void { }
	$finishedExtensionTestRun(_runId: string): void { }
	$markTestRetired(_testIds: string[] | undefined): void { }
}
