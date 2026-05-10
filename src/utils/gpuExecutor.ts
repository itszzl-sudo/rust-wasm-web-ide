export interface GPUComputeOperation {
  type: 'vectorAdd' | 'vectorMul' | 'matrixMul' | 'custom'
  shader?: string
}

export interface GPUDevice {
  device: GPUDevice
  queue: GPUQueue
}

export class GPUExecutor {
  private device: GPUDevice | null = null
  private queue: GPUQueue | null = null
  private available: boolean = false

  async initialize(): Promise<boolean> {
    if (!navigator.gpu) {
      console.warn('WebGPU not supported')
      return false
    }

    try {
      const adapter = await navigator.gpu.requestAdapter()
      if (!adapter) {
        console.warn('Failed to get GPU adapter')
        return false
      }

      this.device = await adapter.requestDevice()
      this.queue = this.device.queue
      this.available = true
      console.log('WebGPU initialized successfully')
      return true
    } catch (e) {
      console.error('Failed to initialize WebGPU:', e)
      return false
    }
  }

  isAvailable(): boolean {
    return this.available
  }

  async executeVectorAdd(a: number[], b: number[]): Promise<number[]> {
    if (!this.device || !this.queue) {
      throw new Error('GPU not initialized')
    }

    const shaderCode = `
      struct Array {
        data: array<f32>,
      }

      @group(0) @binding(0) var<storage, read> inputA: Array;
      @group(0) @binding(1) var<storage, read> inputB: Array;
      @group(0) @binding(2) var<storage, read_write> output: Array;

      @compute @workgroup_size(64)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let index = global_id.x;
        output.data[index] = inputA.data[index] + inputB.data[index];
      }
    `

    const module = this.device.createShaderModule({ code: shaderCode })

    const size = a.length * 4
    const bufferA = this.device.createBuffer({ size, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST })
    const bufferB = this.device.createBuffer({ size, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST })
    const bufferOutput = this.device.createBuffer({ size, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC })
    const bufferResult = this.device.createBuffer({ size, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ })

    this.queue.writeBuffer(bufferA, 0, new Float32Array(a))
    this.queue.writeBuffer(bufferB, 0, new Float32Array(b))

    const bindGroup = this.device.createBindGroup({
      layout: this.device.createBindGroupLayout({
        entries: [
          { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
          { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
          { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }
        ]
      }),
      entries: [
        { binding: 0, resource: { buffer: bufferA } },
        { binding: 1, resource: { buffer: bufferB } },
        { binding: 2, resource: { buffer: bufferOutput } }
      ]
    })

    const pipeline = this.device.createComputePipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [bindGroup.layout] }),
      compute: { module, entryPoint: 'main' }
    })

    const commandEncoder = this.device.createCommandEncoder()
    const passEncoder = commandEncoder.beginComputePass()
    passEncoder.setPipeline(pipeline)
    passEncoder.setBindGroup(0, bindGroup)
    passEncoder.dispatchWorkgroups(Math.ceil(a.length / 64))
    passEncoder.end()

    commandEncoder.copyBufferToBuffer(bufferOutput, 0, bufferResult, 0, size)
    this.queue.submit([commandEncoder.finish()])

    await bufferResult.mapAsync(GPUMapMode.READ)
    const result = new Float32Array(bufferResult.getMappedRange().slice(0))
    bufferResult.unmap()

    bufferA.destroy()
    bufferB.destroy()
    bufferOutput.destroy()
    bufferResult.destroy()

    return Array.from(result)
  }

  async executeVectorMul(a: number[], b: number[]): Promise<number[]> {
    if (!this.device || !this.queue) {
      throw new Error('GPU not initialized')
    }

    const shaderCode = `
      struct Array {
        data: array<f32>,
      }

      @group(0) @binding(0) var<storage, read> inputA: Array;
      @group(0) @binding(1) var<storage, read> inputB: Array;
      @group(0) @binding(2) var<storage, read_write> output: Array;

      @compute @workgroup_size(64)
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let index = global_id.x;
        output.data[index] = inputA.data[index] * inputB.data[index];
      }
    `

    const module = this.device.createShaderModule({ code: shaderCode })

    const size = a.length * 4
    const bufferA = this.device.createBuffer({ size, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST })
    const bufferB = this.device.createBuffer({ size, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST })
    const bufferOutput = this.device.createBuffer({ size, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC })
    const bufferResult = this.device.createBuffer({ size, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ })

    this.queue.writeBuffer(bufferA, 0, new Float32Array(a))
    this.queue.writeBuffer(bufferB, 0, new Float32Array(b))

    const bindGroup = this.device.createBindGroup({
      layout: this.device.createBindGroupLayout({
        entries: [
          { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
          { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'read-only-storage' } },
          { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } }
        ]
      }),
      entries: [
        { binding: 0, resource: { buffer: bufferA } },
        { binding: 1, resource: { buffer: bufferB } },
        { binding: 2, resource: { buffer: bufferOutput } }
      ]
    })

    const pipeline = this.device.createComputePipeline({
      layout: this.device.createPipelineLayout({ bindGroupLayouts: [bindGroup.layout] }),
      compute: { module, entryPoint: 'main' }
    })

    const commandEncoder = this.device.createCommandEncoder()
    const passEncoder = commandEncoder.beginComputePass()
    passEncoder.setPipeline(pipeline)
    passEncoder.setBindGroup(0, bindGroup)
    passEncoder.dispatchWorkgroups(Math.ceil(a.length / 64))
    passEncoder.end()

    commandEncoder.copyBufferToBuffer(bufferOutput, 0, bufferResult, 0, size)
    this.queue.submit([commandEncoder.finish()])

    await bufferResult.mapAsync(GPUMapMode.READ)
    const result = new Float32Array(bufferResult.getMappedRange().slice(0))
    bufferResult.unmap()

    bufferA.destroy()
    bufferB.destroy()
    bufferOutput.destroy()
    bufferResult.destroy()

    return Array.from(result)
  }

  destroy(): void {
    this.device = null
    this.queue = null
    this.available = false
  }
}

export const gpuExecutor = new GPUExecutor()
