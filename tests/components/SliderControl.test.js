import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import SliderControl from '../../components/SliderControl.vue';

describe('SliderControl', () => {
  const factory = (props = {}) => mount(SliderControl, {
    propsData: {
      label: '测试',
      value: 25,
      min: 20,
      max: 50,
      step: 1,
      activeColor: '#1677FF',
      unit: '°C',
      ...props
    }
  });

  it('点击 +5 快捷按钮 emit changing=30', () => {
    const wrapper = factory({ quickButtons: [{ label: '+5', delta: 5 }] });
    wrapper.find('.q-btn').trigger('click');
    expect(wrapper.emitted('changing')[0][0]).toBe(30);
  });

  it('点击 -10 快捷按钮被 clamp 为 min=20', () => {
    const wrapper = factory({ quickButtons: [{ label: '-10', delta: -10 }] });
    wrapper.find('.q-btn').trigger('click');
    expect(wrapper.emitted('changing')[0][0]).toBe(20);
  });

  it('重置按钮 emit resetVal', () => {
    const wrapper = factory({ quickButtons: [{ label: '重置', reset: true, resetVal: 20 }] });
    wrapper.find('.q-btn').trigger('click');
    expect(wrapper.emitted('changing')[0][0]).toBe(20);
  });

  it('通过 slider 拖动 emit changing', () => {
    const wrapper = factory();
    wrapper.find('slider').vm.$emit('changing', { detail: { value: 30 } });
    expect(wrapper.emitted('changing')[0][0]).toBe(30);
  });

  it('value 正确格式化显示', () => {
    const wrapper = factory({ value: 25.5, valueDecimals: 1 });
    expect(wrapper.find('.slider-val').text()).toContain('25.5');
  });
});
