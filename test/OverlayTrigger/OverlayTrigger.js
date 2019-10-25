/*************************************************************************
* ADOBE CONFIDENTIAL
* ___________________
*
* Copyright 2019 Adobe
* All Rights Reserved.
*
* NOTICE: All information contained herein is, and remains
* the property of Adobe and its suppliers, if any. The intellectual
* and technical concepts contained herein are proprietary to Adobe
* and its suppliers and are protected by all applicable intellectual
* property laws, including trade secret and copyright laws.
* Dissemination of this information or reproduction of this material
* is strictly forbidden unless prior written permission is obtained
* from Adobe.
**************************************************************************/

import assert from 'assert';
import Button from '../../src/Button/js/Button';
import {mount} from 'enzyme';
import OverlayTrigger from '../../src/OverlayTrigger/js/OverlayTrigger';
import Popover from '../../src/Popover/js/Popover';
import React from 'react';
import ReactDOM from 'react-dom';
import sinon from 'sinon';
import Tooltip from '../../src/Tooltip/js/Tooltip';

describe('OverlayTrigger', () => {
  describe('non window behaviors', () => {
    let tree;
    let clock;
    beforeEach(() => {
      clock = sinon.useFakeTimers();
    });
    afterEach(() => {
      if (tree && tree.exists()) {
        tree.unmount();
        tree = null;
      }
      clock.runAll();
      clock.restore();
    });
    it('should support lastFocus prop', () => {
      let lastFocus = {
        focus: sinon.spy()
      };
      let onClickSpy = sinon.spy();
      let onExitedSpy = sinon.spy();
      let onEnteredSpy = sinon.spy();
      tree = mount(
        <OverlayTrigger onClick={onClickSpy} onEntered={onEnteredSpy} onExited={onExitedSpy} trigger="click">
          <Button>Click me</Button>
          <Popover>Popover</Popover>
        </OverlayTrigger>
      );

      // open overlay by clicking the trigger element
      tree.find(Button).getDOMNode().focus();
      tree.find(Button).simulate('click');
      clock.tick(50);

      assert.equal(tree.instance().rememberedFocus(), tree.find(Button).getDOMNode());
      assert(onClickSpy.calledOnce);
      assert(onEnteredSpy.calledOnce);
      assert(tree.state('show'));
      assert.equal(document.querySelector('.spectrum-Popover'), document.activeElement);
      assert.equal(getComputedStyle(document.body).overflow, '');

      // set lastFocus prop using stub
      tree.setProps({lastFocus});
      assert.equal(tree.instance().rememberedFocus(), lastFocus);
      tree.find(Button).simulate('click');
      clock.tick(125);

      assert(onClickSpy.calledTwice);
      assert(onExitedSpy.calledOnce);
      assert(!tree.state('show'));
      assert(lastFocus.focus.called);
    });

    it('should add aria-describedby to trigger when Overlay is a Tooltip', () => {
      tree = mount(
        <OverlayTrigger trigger="click">
          <Button>Hover me</Button>
          <Tooltip id="foo">Tooltip</Tooltip>
        </OverlayTrigger>
      );
      tree.find(Button).simulate('click');
      assert(tree.state('show'));
      assert.equal(tree.find(Button).getDOMNode().getAttribute('aria-describedby'), 'foo');
      assert.equal(document.querySelector('.spectrum-Tooltip').id, 'foo');
      tree.find(Button).simulate('click');
      assert(!tree.state('show'));
      assert(!tree.find(Button).getDOMNode().hasAttribute('aria-describedby'));
    });

    it('should add aria-describedby to trigger when Overlay is a Tooltip using the tooltip generated id', () => {
      tree = mount(
        <OverlayTrigger trigger="click">
          <Button>Hover me</Button>
          <Tooltip>Tooltip</Tooltip>
        </OverlayTrigger>
      );

      tree.find(Button).simulate('click');
      assert(tree.state('show'));
      assert.equal(tree.find(Button).getDOMNode().getAttribute('aria-describedby'),
        document.querySelector('.spectrum-Tooltip').id);
      tree.find(Button).simulate('click');
      assert(!tree.state('show'));
      assert(!tree.find(Button).getDOMNode().hasAttribute('aria-describedby'));
    });

    it('should add scroll listeners to parents on show and remove on hide or unmount', () => {
      tree = mount(
        <div style={{overflow: 'auto'}}>
          <OverlayTrigger trigger="click">
            <Button>Hover me</Button>
            <Tooltip>Tooltip</Tooltip>
          </OverlayTrigger>
        </div>
      );
      let parent = tree.getDOMNode();
      let listeners = new Map();
      sinon.stub(parent, 'addEventListener').callsFake((event, func) => {
        assert(!listeners.has(func));
        listeners.set(func, event);
      });
      sinon.stub(parent, 'removeEventListener').callsFake((event, func) => {
        assert(listeners.has(func));
        listeners.delete(func);
      });
      let component = tree.instance();
      assert.equal(component._scrollParents, null);
      assert.equal(listeners.size, 0);

      // show
      tree.find(Button).simulate('click');
      let overlay = tree.find(OverlayTrigger);
      assert(overlay.state('show'));
      assert.equal(overlay.instance()._scrollParents.length, 1);
      assert.equal(listeners.size, 1);

      // hide
      tree.find(Button).simulate('click');
      assert(!overlay.state('show'));
      assert.equal(overlay.instance()._scrollParents, null);
      assert.equal(listeners.size, 0);

      // show
      tree.find(Button).simulate('click');
      assert(overlay.state('show'));
      assert.equal(overlay.instance()._scrollParents.length, 1);
      assert.equal(listeners.size, 1);

      // hide
      let savedOverlayInstance = overlay.instance();
      tree.unmount();
      assert.equal(savedOverlayInstance._scrollParents, null);
      assert.equal(listeners.size, 0);
    });

    it('should support delay', async () => {
      const delay = 10;
      tree = mount(
        <OverlayTrigger trigger="hover" delay={delay}>
          <Button>Click me</Button>
          <Popover trapFocus={false}>Popover</Popover>
        </OverlayTrigger>
      );

      tree.find(Button).simulate('mouseOver');
      assert(!tree.state('show'));
      clock.tick(delay);
      assert(tree.state('show'));
      tree.find(Button).simulate('mouseOut');
      assert(tree.state('show'));

      // test clearTimeout for mouseOut
      clock.tick(delay - 5);
      tree.find(Button).simulate('mouseOver');
      clock.tick(delay);
      assert(tree.state('show'));
      tree.find(Button).simulate('mouseOut');
      clock.tick(delay);
      assert(!tree.state('show'));

      // test clearTimeout for mouseOver
      tree.find(Button).simulate('mouseOver');
      assert(!tree.state('show'));
      clock.tick(delay - 5);
      tree.find(Button).simulate('mouseOut');
      assert(!tree.state('show'));
      clock.tick(delay);
      assert(!tree.state('show'));

      // with no delay show/hide immediately
      tree.setProps({delay: null});
      tree.find(Button).simulate('mouseOver');
      assert(tree.state('show'));
      tree.find(Button).simulate('mouseOut');
      clock.tick(tree.prop('delayHide'));
      assert(!tree.state('show'));
    });

    it('should support delayShow', async () => {
      let delayShow = 10;
      tree = mount(
        <OverlayTrigger trigger="hover" delayShow={delayShow}>
          <Button>Click me</Button>
          <Popover trapFocus={false}>Popover</Popover>
        </OverlayTrigger>
      );

      tree.find(Button).simulate('mouseOver');
      assert(!tree.state('show'));
      clock.tick(delayShow);
      assert(tree.state('show'));
      tree.find(Button).simulate('mouseOut');
      clock.tick(tree.prop('delayHide'));
      assert(!tree.state('show'));

      tree.setProps({delayShow: null});
      tree.find(Button).simulate('mouseOver');
      assert(tree.state('show'));
      const showStub = sinon.spy();
      tree.instance().show = showStub;
      tree.instance().handleDelayedShow();
      assert(tree.state('show'));
      assert(!showStub.called);
    });

    it('should support delayHide', () => {
      let delayHide = 10;
      tree = mount(
        <OverlayTrigger trigger="hover" delayHide={delayHide}>
          <Button>Click me</Button>
          <Popover trapFocus={false}>Popover</Popover>
        </OverlayTrigger>
      );

      tree.find(Button).simulate('mouseOver');
      assert(tree.state('show'));
      tree.find(Button).simulate('mouseOut');
      clock.tick(delayHide);
      assert(!tree.state('show'));

      tree.setProps({delay: 0, delayHide: undefined});
      tree.find(Button).simulate('mouseOver');
      assert(tree.state('show'));
      tree.find(Button).simulate('mouseOut');
      clock.tick(0);
      assert(!tree.state('show'));
      tree.setProps({delayHide, delay: undefined});

      const hideStub = sinon.spy();
      tree.instance().hide = hideStub;
      tree.instance().handleDelayedHide();
      assert(!tree.state('show'));
      assert(!hideStub.called);
    });

    it('disabled prop should hide overlay', () => {
      tree = mount(
        <OverlayTrigger trigger="click">
          <Button>Click me</Button>
          <Popover>Popover</Popover>
        </OverlayTrigger>
      );

      tree.find(Button).simulate('click');
      assert(tree.state('show'));
      tree.setProps({disabled: true});
      assert(!tree.state('show'));
    });

    it('supports longClicks to open', () => {
      let clickSpy = sinon.spy();
      let preventDefaultSpy = sinon.spy();
      let onShowSpy = sinon.spy();
      let onHideSpy = sinon.spy();
      tree = mount(
        <OverlayTrigger onClick={clickSpy} onShow={onShowSpy} onHide={onHideSpy} trigger="longClick">
          <Button>Click me</Button>
          <Popover>Popover</Popover>
        </OverlayTrigger>
      );
      let button = tree.find(Button);
      button.simulate('mouseDown', {button: 0});
      clock.tick(250);
      assert(tree.state('show'));
      assert(!clickSpy.called);
      assert(onShowSpy.calledOnce);
      button.simulate('mouseUp', {button: 0, preventDefault: preventDefaultSpy});
      assert(tree.state('show'));
      assert(preventDefaultSpy.calledOnce);
      assert(!clickSpy.called);
      button.simulate('mouseDown', {button: 0});
      clock.tick(125);
      assert(tree.state('show'));
      assert(!clickSpy.called);
      button.simulate('mouseUp', {button: 0, preventDefault: preventDefaultSpy});
      assert(!tree.state('show'));
      assert(preventDefaultSpy.calledOnce);
      assert(clickSpy.called);
      assert(onHideSpy.calledOnce);
    });

    it('does not call long click prop if the mouse is lifted before the timeout', () => {
      let clickSpy = sinon.spy();
      tree = mount(
        <OverlayTrigger onClick={clickSpy} trigger="longClick">
          <Button>Click me</Button>
          <Popover>Popover</Popover>
        </OverlayTrigger>
      );
      let button = tree.find(Button);
      button.simulate('mouseDown', {button: 0});
      clock.tick(125);
      assert(!tree.state('show'));
      button.simulate('mouseUp', {button: 0});
      assert(!tree.state('show'));
      assert(clickSpy.called);
    });

    it('opens using keyboard event, ArrowDown + Alt', () => {
      let clickSpy = sinon.spy();
      tree = mount(
        <OverlayTrigger onClick={clickSpy} trigger="longClick">
          <Button>Click me</Button>
          <Popover>Popover</Popover>
        </OverlayTrigger>
      );
      let button = tree.find(Button);
      button.simulate('keyDown', {key: 'ArrowDown', altKey: true});
      assert(tree.state('show'));
      assert(!clickSpy.called);
    });

    it('opens using keyboard event, Down + Alt', () => {
      let clickSpy = sinon.spy();
      tree = mount(
        <OverlayTrigger onClick={clickSpy} trigger="longClick">
          <Button>Click me</Button>
          <Popover>Popover</Popover>
        </OverlayTrigger>
      );
      let button = tree.find(Button);
      button.simulate('keyDown', {key: 'Down', altKey: true});
      assert(tree.state('show'));
      assert(!clickSpy.called);
    });
  });

  describe('window behaviors', () => {
    let tree;
    let clock;
    let mountNode;

    beforeEach(() => {
      clock = sinon.useFakeTimers();
      mountNode = document.createElement('DIV');
      document.body.appendChild(mountNode);
    });

    afterEach(() => {
      if (tree) {
        tree.detach();
        tree = null;
      }
      clock.runAll();
      clock.restore();
      document.body.removeChild(mountNode);
      mountNode = null;
    });

    it('does not open if mouseout and mouseup before the timeout', () => {
      let clickSpy = sinon.spy();
      tree = mount(
        <div>
          <OverlayTrigger onClick={clickSpy} trigger="longClick">
            <Button>Click me</Button>
            <Popover>Popover</Popover>
          </OverlayTrigger>
          <div className="externalTarget">external</div>
        </div>,
        {attachTo: mountNode}
      );
      let overlayTrigger = tree.find(OverlayTrigger).instance();
      let button = tree.find(Button);
      let externalTarget = tree.find('.externalTarget');
      button.simulate('mouseDown', {button: 0});
      clock.tick(150);
      button.simulate('mouseOut');
      clock.tick(50);
      ReactDOM.findDOMNode(externalTarget.instance()).dispatchEvent(new MouseEvent('mouseUp', {button: 0, bubbles: true}));
      assert(!overlayTrigger.state.show);
      assert(!clickSpy.called);
      clock.tick(50); // got to end of timeout and make sure we still don't show
      assert(!overlayTrigger.state.show);
      assert(!clickSpy.called);
    });

    it('opens if mouseout before timeout and mouseup after the timeout', () => {
      let clickSpy = sinon.spy();
      tree = mount(
        <div>
          <OverlayTrigger onClick={clickSpy} trigger="longClick">
            <Button>Click me</Button>
            <Popover>Popover</Popover>
          </OverlayTrigger>
          <div className="externalTarget">external</div>
        </div>,
        {attachTo: mountNode}
      );
      let overlayTrigger = tree.find(OverlayTrigger).instance();
      let button = tree.find(Button);
      let externalTarget = tree.find('.externalTarget');
      button.simulate('mouseDown', {button: 0});
      clock.tick(150);
      button.simulate('mouseOut');
      clock.tick(100);
      ReactDOM.findDOMNode(externalTarget.instance()).dispatchEvent(new MouseEvent('mouseUp', {button: 0, bubbles: true}));
      assert(overlayTrigger.state.show);
      assert(!clickSpy.called);
    });

    it('fires onHide prop if controlled', () => {
      let onHideSpy = sinon.spy();
      tree = mount(
        <div>
          <OverlayTrigger onHide={onHideSpy} trigger="click" show>
            <Button>Click me</Button>
            <Popover>Popover</Popover>
          </OverlayTrigger>
          <div className="externalTarget">external</div>
        </div>,
        {attachTo: mountNode}
      );
      let overlayTrigger = tree.find(OverlayTrigger).instance();
      let externalTarget = tree.find('.externalTarget');
      assert(overlayTrigger.state.show);
      ReactDOM.findDOMNode(externalTarget.instance()).dispatchEvent(new MouseEvent('click', {bubbles: true}));
      assert(overlayTrigger.state.show);
      assert(onHideSpy.called);
    });
  });
});
