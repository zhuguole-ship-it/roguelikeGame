import type {
  BeastContractDomainCollectionLoadout,
  BeastContractDomainEquipmentPresentation,
  BeastContractDomainLoadoutSnapshot,
} from '../../game/types'
import {
  BEAST_CONTRACT_DOMAIN_SET_NAME,
  getBeastContractDomainSetEffectCopy,
  getBeastContractDomainSingleEffectCopy,
} from './beastContractDomainEquipmentCopy'

const isThresholdActive = (
  loadout: BeastContractDomainCollectionLoadout,
  threshold: 2 | 3 | 5,
) => threshold === 2
  ? loadout.twoPieceActive
  : threshold === 3
    ? loadout.threePieceActive
    : loadout.fivePieceActive

export const BeastContractDomainEquipmentDetails = ({
  presentation,
  loadout,
  testIdPrefix,
}: {
  presentation: BeastContractDomainEquipmentPresentation
  loadout: BeastContractDomainLoadoutSnapshot
  testIdPrefix: string
}) => {
  const collectionLoadout = loadout[presentation.collection]
  const setName = BEAST_CONTRACT_DOMAIN_SET_NAME[presentation.collection]
  const singleEffect = getBeastContractDomainSingleEffectCopy(presentation.descriptionKey)
  const identity = presentation.identity === 'relic'
    ? `协同散件，不计套装件数。关联套装：${setName}。`
    : presentation.identity === 'boss-core-replacement'
      ? `${setName} · Boss 替代核心武器，计入对应套装 1 件；与同套专用猎行弓互斥。`
      : `${setName} · 核心套装装备，计入对应套装 1 件。`

  return (
    <>
      <div data-testid={`${testIdPrefix}-identity`}>
        <dt className="font-pixel text-[8px] tracking-[0.12em] text-[#9dd5ac]">套装身份</dt>
        <dd className="mt-1">{identity}</dd>
      </div>
      {singleEffect ? (
        <div data-testid={`${testIdPrefix}-single-effect`}>
          <dt className="font-pixel text-[8px] tracking-[0.12em] text-[#9dd5ac]">独立效果</dt>
          <dd className="mt-1">{singleEffect}</dd>
        </div>
      ) : null}
      {presentation.coreContribution === 1 ? (
        <div data-testid={`${testIdPrefix}-set-effects`}>
          <dt className="font-pixel text-[8px] tracking-[0.12em] text-[#9dd5ac]">套装效果</dt>
          <dd className="mt-1 space-y-2">
            <p className="font-pixel text-[9px] text-amber-200" data-testid={`${testIdPrefix}-set-count`}>
              {setName} · 已装备核心件数 {collectionLoadout.coreCount}/6
            </p>
            {presentation.thresholds.map(({ threshold, descriptionKey }) => {
              const active = isThresholdActive(collectionLoadout, threshold)
              const copy = getBeastContractDomainSetEffectCopy(descriptionKey)
              if (!copy) return null
              return (
                <section
                  key={threshold}
                  aria-label={`${threshold} 件套，${active ? '已激活' : '未激活'}`}
                  className={`border-l-2 pl-2 ${active ? 'border-amber-300 bg-[rgba(120,85,24,0.18)] text-[#fef3c7]' : 'border-[#405248] text-[#9fb0a3]'}`}
                  data-active={active ? 'true' : 'false'}
                  data-testid={`${testIdPrefix}-threshold-${threshold}`}
                >
                  <p className="font-pixel text-[8px]">{threshold} 件 · {active ? '已激活' : '未激活'}</p>
                  <ul className="mt-1 space-y-1 pl-3 text-[0.9rem] leading-snug">
                    {copy.map((line) => <li key={line} className="list-disc">{line}</li>)}
                  </ul>
                </section>
              )
            })}
          </dd>
        </div>
      ) : null}
    </>
  )
}
