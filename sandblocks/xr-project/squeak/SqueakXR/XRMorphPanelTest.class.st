Class {
	#name : #XRMorphPanelTest,
	#superclass : #XRTestCase,
	#category : #'SqueakXR-Core-Tests'
}

{ #category : #'as yet unclassified' }
XRMorphPanelTest >> testMapsWorldToMorph [

	| panel morphPoint |
	panel := XRMorphPanel new
		pixelsPerMeter: 1;
		morph: (Morph new extent: 100 @ 100);
		yourself.
	morphPoint := panel worldToMorph: 1 @ 1 @ 0.
	
	self assert: morphPoint = 25 @ 25.
]
