Class {
	#name : #XRMorphPanelTest,
	#superclass : #XRTestCase,
	#category : #'SqueakXR-Core-Tests'
}

{ #category : #'as yet unclassified' }
XRMorphPanelTest >> canvasMock [

	^ XRMock new mock_understand: #(width: height:)
]

{ #category : #'as yet unclassified' }
XRMorphPanelTest >> canvasTextureMock [

	^ XRMock new
]

{ #category : #'as yet unclassified' }
XRMorphPanelTest >> testMapsWorldToMorph [

	| panel morphPoint |
	panel := XRMorphPanel new
		threeObject: (self threeObjectMock
			mock_respondTo: #worldToLocal: with: [:x | x]); "identity transform"
		canvas: self canvasMock;
		canvasTexture: self canvasTextureMock;
		pixelsPerMeter: 0.25;
		morph: (Morph new extent: 100 @ 100);
		yourself.
	morphPoint := panel worldToMorph: 1 @ 1 @ 0.
	
	self assert: morphPoint = (25 @ 25).
]

{ #category : #'as yet unclassified' }
XRMorphPanelTest >> threeObjectMock [

	| mock |
	mock := XRMock new.
	mock
		mock_respondTo: #scale with: 1 @ 1 @ 1;
		mock_understand: #(set:y:z:).
	^ mock
]
